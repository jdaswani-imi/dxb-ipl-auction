// Seeds midseason auction transfers into squad_entries.
//
// How it works:
//   1. Reads the first post-auction scorecard (game 1529279) to get the cutoff date.
//   2. For each transfer below: marks the player's old squad entry as 'traded',
//      and inserts a new entry with valid_from_date = cutoff date so that
//      fantasy points from that game onwards credit the NEW owner.
//
// Fill in TRANSFERS before running:
//   Run: node scripts/seed-midseason-auction.mjs
//   Add --dry-run to preview without writing.
//
// To find player IDs:  SELECT id, name FROM players WHERE name ILIKE '%search%';
// To find team IDs:    SELECT id, name FROM teams;

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')

// ── env ───────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const { NEXT_PUBLIC_SUPABASE_URL: BASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = env
if (!BASE_URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ── resolve cutoff date from the first post-auction scorecard ─────────────────
const FIRST_POST_AUCTION_MATCH = '1529279'

function findScorecard(id) {
  // Try both the flat folder and the midseason_auction subfolder
  const candidates = [
    join('supabase', 'fixtures', 'scorecards', `${id}.json`),
    join('supabase', 'fixtures', 'scorecards', 'midseason_auction', `${id}.json`),
  ]
  for (const p of candidates) {
    try { return JSON.parse(readFileSync(p, 'utf8')) } catch { /* try next */ }
  }
  return null
}

const anchorMatch = findScorecard(FIRST_POST_AUCTION_MATCH)
if (!anchorMatch) {
  console.error(`Cannot find scorecard for match ${FIRST_POST_AUCTION_MATCH}.`)
  console.error('Expected at supabase/fixtures/scorecards/[midseason_auction/]1529279.json')
  process.exit(1)
}
const VALID_FROM = anchorMatch.info.dates[0]  // e.g. "2026-04-10"
console.log(`Cutoff date (from match ${FIRST_POST_AUCTION_MATCH}): ${VALID_FROM}\n`)

// ── TRANSFERS ─────────────────────────────────────────────────────────────────
// Fill this array with the actual midseason auction results.
// Each entry needs:
//   player_id   — UUID from the players table
//   new_team_id — UUID from the teams table
//   price_lakhs — price paid in this mini auction (integer, e.g. 200 = 2 Cr)
//
// Example:
// const TRANSFERS = [
//   { player_id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', new_team_id: 'yyyyyyyy-...', price_lakhs: 400 },
// ]
const TRANSFERS = [
  // TODO: fill in the midseason auction transfers
  // { player_id: '...', new_team_id: '...', price_lakhs: 200 },
]

if (TRANSFERS.length === 0) {
  console.error('TRANSFERS array is empty — fill it in before running this script.')
  console.error('Tip: run the SQL below to get player and team IDs:\n')
  console.error('  SELECT id, name FROM players ORDER BY name;')
  console.error('  SELECT id, name FROM teams ORDER BY name;')
  process.exit(1)
}

// ── REST helpers ──────────────────────────────────────────────────────────────
const HEADERS = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function query(path) {
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    headers: { ...HEADERS, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function patch(path, body) {
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}: ${await res.text()}`)
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`)
}

// ── process transfers ─────────────────────────────────────────────────────────
let applied = 0, failed = 0

for (const { player_id, new_team_id, price_lakhs } of TRANSFERS) {
  // Look up the player and their current active squad entry
  const [player] = await query(`players?id=eq.${player_id}&select=id,name`)
  if (!player) { console.error(`✗ Player not found: ${player_id}`); failed++; continue }

  const activeEntries = await query(
    `squad_entries?player_id=eq.${player_id}&status=eq.active&select=id,team_id`
  )
  const [newTeam] = await query(`teams?id=eq.${new_team_id}&select=id,name`)
  if (!newTeam) { console.error(`✗ Team not found: ${new_team_id}`); failed++; continue }

  const tag = DRY_RUN ? '[dry-run] ' : ''

  if (activeEntries.length > 0) {
    const old = activeEntries[0]
    const [oldTeam] = await query(`teams?id=eq.${old.team_id}&select=name`)
    console.log(`${tag}${player.name}: ${oldTeam?.name ?? '?'} → ${newTeam.name}  (${price_lakhs / 100} Cr from ${VALID_FROM})`)
    if (!DRY_RUN) {
      // Mark old entry as traded
      await patch(`squad_entries?id=eq.${old.id}`, { status: 'traded' })
    }
  } else {
    console.log(`${tag}${player.name}: (no prior active entry) → ${newTeam.name}  (${price_lakhs / 100} Cr)`)
  }

  if (!DRY_RUN) {
    // Insert new squad entry with the cutoff date
    await post('squad_entries', {
      team_id:         new_team_id,
      player_id:       player_id,
      price_lakhs:     price_lakhs,
      auction_type:    'mini',
      status:          'active',
      valid_from_date: VALID_FROM,
      acquired_at:     new Date().toISOString(),
    })
  }

  applied++
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done. ${applied} transfers ${DRY_RUN ? 'previewed' : 'applied'}, ${failed} failed.`)
if (DRY_RUN) console.log('Re-run without --dry-run to apply.')
