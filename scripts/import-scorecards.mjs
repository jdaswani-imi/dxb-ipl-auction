// Reads every JSON scorecard in supabase/fixtures/scorecards/, computes Dream11 T20
// fantasy points ball-by-ball, and upserts into matches + match_player_performances.
// Run from project root: node scripts/import-scorecards.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

// ── env ───────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const { NEXT_PUBLIC_SUPABASE_URL: BASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = env
if (!BASE_URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

async function upsert(table, rows, conflict) {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`POST ${table} → HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── Dream11 T20 scoring (from official scoring system) ────────────────────────
const PTS = {
  announced:       4,
  run:             1,
  boundary:        4,
  six:             6,
  milestone_25:    4,
  milestone_50:    8,
  milestone_75:   12,
  milestone_100:  16,
  duck:           -2,
  dot:             1,
  wicket:         30,
  lbw_bowled:      8,
  haul_3:          4,
  haul_4:          8,
  haul_5:         12,
  maiden:         12,
  catch_:          8,   // 'catch' is a reserved word in some contexts
  catch_bonus:     4,
  stumping:       12,
  runout_direct:  12,
  runout_assisted: 6,
}

function economyPts(eco) {
  if (eco < 5)              return  6
  if (eco <= 5.99)          return  4
  if (eco <= 7)             return  2
  if (eco >= 10 && eco <= 11)    return -2
  if (eco > 11 && eco <= 12)     return -4
  if (eco > 12)             return -6
  return 0
}

function strikeRatePts(sr) {
  // Dream11: negative SR points only apply for SR ≤ 70
  if (sr > 170)             return  6
  if (sr >= 150.01)         return  4
  if (sr >= 130)            return  2
  if (sr <= 70 && sr >= 60) return -2
  if (sr < 60 && sr >= 50)  return -4
  if (sr < 50)              return -6
  return 0
}

// Wicket kinds that credit the bowler
const BOWLER_WICKET = new Set([
  'caught', 'bowled', 'lbw', 'stumped', 'hit wicket',
  'obstructing the field', 'handled the ball', 'timed out',
])
const LBW_BOWLED = new Set(['lbw', 'bowled'])

// ── match processor ───────────────────────────────────────────────────────────
function processMatch(data, cricsheetId) {
  const { info, innings } = data

  // team lookup for all listed players (original XI + potential impact sub = 12 each)
  const playerTeam = {}
  for (const [team, players] of Object.entries(info.players))
    for (const p of players)
      playerTeam[p] = team

  function blank(team) {
    return {
      ipl_team: team,
      runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, dismissal: null, did_bat: false,
      balls_bowled: 0, runs_conceded: 0, wickets: 0, dot_balls: 0, maidens: 0, lbw_bowled_wickets: 0,
      catches: 0, stumpings: 0, direct_runouts: 0, assisted_runouts: 0,
      appeared: false,
    }
  }

  const stats = {}
  function get(name, teamHint) {
    if (!stats[name]) stats[name] = blank(playerTeam[name] ?? teamHint ?? 'Unknown')
    return stats[name]
  }

  for (const inning of innings) {
    const battingTeam = inning.team
    const bowlingTeam = info.teams.find(t => t !== battingTeam)

    for (const over of inning.overs) {
      const deliveries   = over.deliveries
      const overBowler   = deliveries[0]?.bowler
      const allSameBowler = deliveries.every(d => d.bowler === overBowler)
      const overTotalRuns = deliveries.reduce((s, d) => s + d.runs.total, 0)

      for (const d of deliveries) {
        const batter = d.batter
        const bowler = d.bowler
        const isWide   = !!(d.extras?.wides)
        const isNoBall = !!(d.extras?.noballs)
        const batterRuns = d.runs.batter

        const b  = get(batter, battingTeam)
        const bw = get(bowler, bowlingTeam)
        b.ipl_team  = battingTeam
        bw.ipl_team = bowlingTeam
        b.appeared  = bw.appeared = true

        // batting
        b.did_bat = true
        if (!isWide) {
          b.balls_faced++
          if (batterRuns === 4) b.fours++
          if (batterRuns === 6) b.sixes++
        }
        b.runs_scored += batterRuns

        // bowling: conceded = batter runs + wides + no-balls (byes/legbyes go to extras, not bowler)
        bw.runs_conceded += batterRuns + (d.extras?.wides ?? 0) + (d.extras?.noballs ?? 0)

        if (!isWide && !isNoBall) {
          bw.balls_bowled++
          if (d.runs.total === 0) bw.dot_balls++
        }

        // wickets
        for (const w of (d.wickets ?? [])) {
          const kind      = w.kind
          const playerOut = w.player_out
          const fielders  = w.fielders ?? []

          if (playerOut) get(playerOut, battingTeam).dismissal = kind

          if (kind === 'run out') {
            if (fielders.length === 1) {
              const f = get(fielders[0].name, bowlingTeam)
              f.direct_runouts++
              f.appeared = true
            } else if (fielders.length >= 2) {
              // last two fielders get assisted credit
              for (const fi of fielders.slice(-2)) {
                const f = get(fi.name, bowlingTeam)
                f.assisted_runouts++
                f.appeared = true
              }
            }
          } else if (BOWLER_WICKET.has(kind)) {
            bw.wickets++
            if (LBW_BOWLED.has(kind))  bw.lbw_bowled_wickets++
            if (kind === 'stumped' && fielders.length > 0) {
              const f = get(fielders[0].name, bowlingTeam)
              f.stumpings++
              f.appeared = true
            }
            if (kind === 'caught' && fielders.length > 0) {
              const f = get(fielders[0].name, bowlingTeam)
              f.catches++
              f.appeared = true
            }
          }
        }
      }

      // maiden: complete 6-ball over (no wides/no-balls when total = 0), same bowler throughout
      if (allSameBowler && overTotalRuns === 0 && deliveries.length === 6 && overBowler) {
        get(overBowler, bowlingTeam).maidens++
      }
    }
  }

  // batters who never got a dismissal entry batted to the end
  for (const s of Object.values(stats))
    if (s.did_bat && s.dismissal === null) s.dismissal = 'not out'

  // ── fantasy points ──────────────────────────────────────────────────────────
  const registry = info.registry?.people ?? {}
  const rows = []

  for (const [name, s] of Object.entries(stats)) {
    if (!s.appeared) continue

    let pts = PTS.announced

    // batting
    pts += s.runs_scored * PTS.run
    pts += s.fours       * PTS.boundary
    pts += s.sixes       * PTS.six
    // century replaces all other milestones; otherwise highest milestone only
    if      (s.runs_scored >= 100) pts += PTS.milestone_100
    else if (s.runs_scored >= 75)  pts += PTS.milestone_75
    else if (s.runs_scored >= 50)  pts += PTS.milestone_50
    else if (s.runs_scored >= 25)  pts += PTS.milestone_25
    // duck: dismissed for 0 (applies to all roles here; refine by joining players table if needed)
    if (s.did_bat && s.dismissal && s.dismissal !== 'not out' && s.runs_scored === 0)
      pts += PTS.duck

    // bowling
    pts += s.wickets           * PTS.wicket
    pts += s.lbw_bowled_wickets * PTS.lbw_bowled
    pts += s.dot_balls         * PTS.dot
    pts += s.maidens           * PTS.maiden
    if      (s.wickets >= 5) pts += PTS.haul_5
    else if (s.wickets >= 4) pts += PTS.haul_4
    else if (s.wickets >= 3) pts += PTS.haul_3

    // economy (min 2 overs = 12 legal balls)
    if (s.balls_bowled >= 12) {
      const eco = (s.runs_conceded / s.balls_bowled) * 6
      pts += economyPts(eco)
    }

    // fielding
    pts += s.catches        * PTS.catch_
    if (s.catches >= 3)     pts += PTS.catch_bonus  // bonus is awarded once regardless of count
    pts += s.stumpings       * PTS.stumping
    pts += s.direct_runouts  * PTS.runout_direct
    pts += s.assisted_runouts * PTS.runout_assisted

    // strike rate (min 10 balls)
    if (s.balls_faced >= 10) {
      const sr = (s.runs_scored / s.balls_faced) * 100
      pts += strikeRatePts(sr)
    }

    rows.push({
      cricsheet_registry_id: registry[name] ?? null,
      player_name:           name,
      ipl_team:              s.ipl_team,
      runs_scored:           s.runs_scored,
      balls_faced:           s.balls_faced,
      fours:                 s.fours,
      sixes:                 s.sixes,
      dismissal:             s.dismissal,
      balls_bowled:          s.balls_bowled,
      runs_conceded:         s.runs_conceded,
      wickets:               s.wickets,
      dot_balls:             s.dot_balls,
      maidens:               s.maidens,
      lbw_bowled_wickets:    s.lbw_bowled_wickets,
      catches:               s.catches,
      stumpings:             s.stumpings,
      direct_runouts:        s.direct_runouts,
      assisted_runouts:      s.assisted_runouts,
      fantasy_points:        pts,
    })
  }

  return rows
}

// ── main ──────────────────────────────────────────────────────────────────────
const SCORECARD_DIR = join('supabase', 'fixtures', 'scorecards')

function findJsonFiles(dir) {
  const out = []
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) out.push(...findJsonFiles(full))
      else if (e.name.endsWith('.json')) out.push(full)
    }
  } catch { /* dir missing */ }
  return out
}

const files = findJsonFiles(SCORECARD_DIR)
if (files.length === 0) {
  console.error(`No JSON files found under ${SCORECARD_DIR}`)
  console.error('Create supabase/fixtures/scorecards/ and drop your Cricsheet JSONs inside.')
  process.exit(1)
}

if (files.length === 0) {
  console.log(`No JSON files found in ${SCORECARD_DIR}`)
  process.exit(0)
}

console.log(`Found ${files.length} scorecard(s) — importing…\n`)

let imported = 0, skipped = 0

for (const file of files) {
  const cricsheetId = basename(file, '.json')
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const { info } = data

  const outcome     = info.outcome ?? {}
  const winByRuns   = outcome.by?.runs   ?? null
  const winByWickets = outcome.by?.wickets ?? null

  const matchRow = {
    cricsheet_id:    cricsheetId,
    match_date:      info.dates[0],
    season:          info.season,
    event_name:      info.event?.name    ?? null,
    match_number:    info.event?.match_number ?? null,
    venue:           info.venue          ?? null,
    team1:           info.teams[0],
    team2:           info.teams[1],
    toss_winner:     info.toss?.winner   ?? null,
    toss_decision:   info.toss?.decision ?? null,
    winner:          outcome.winner      ?? null,
    win_by_runs:     winByRuns,
    win_by_wickets:  winByWickets,
    player_of_match: info.player_of_match ?? [],
  }

  try {
    const [match] = await upsert('matches', [matchRow], 'cricsheet_id')
    const perfRows = processMatch(data, cricsheetId).map(r => ({ ...r, match_id: match.id }))
    await upsert('match_player_performances', perfRows, 'match_id,player_name')

    const topScorer = perfRows.reduce((a, b) => a.fantasy_points > b.fantasy_points ? a : b)
    console.log(
      `✓ ${cricsheetId}  ${info.teams[0]} vs ${info.teams[1]}  (${info.dates[0]})` +
      `  — ${perfRows.length} players  — top: ${topScorer.player_name} ${topScorer.fantasy_points}pts`
    )
    imported++
  } catch (err) {
    console.error(`✗ ${cricsheetId}: ${err.message}`)
    skipped++
  }
}

console.log(`\nDone. ${imported} imported, ${skipped} failed.`)
