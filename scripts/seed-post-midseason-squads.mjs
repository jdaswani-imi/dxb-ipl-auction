// Seeds the post-midseason auction squads into squad_entries.
// For players who moved teams: marks old entry as 'traded', inserts new entry
// with valid_from_date = date of match 1529279 (first game of new teams).
// For players who stayed: updates price if it changed, leaves valid_from_date alone.
// Run: node scripts/seed-post-midseason-squads.mjs [--dry-run]

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const { NEXT_PUBLIC_SUPABASE_URL: BASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = env
if (!BASE_URL || !KEY) { console.error('Missing env vars'); process.exit(1) }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const get  = async path => { const r = await fetch(`${BASE_URL}/rest/v1/${path}`, { headers: { ...H, Accept: 'application/json' } }); if (!r.ok) throw new Error(`GET ${path}: ${await r.text()}`); return r.json() }
const post = async (path, body) => { const r = await fetch(`${BASE_URL}/rest/v1/${path}`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`POST ${path}: ${await r.text()}`) }
const patch = async (path, body) => { const r = await fetch(`${BASE_URL}/rest/v1/${path}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`PATCH ${path}: ${await r.text()}`) }

// ── resolve cutoff date from match 1529279 ────────────────────────────────────
function findScorecard(id) {
  for (const p of [
    join('supabase','fixtures','scorecards',`${id}.json`),
    join('supabase','fixtures','scorecards','midseason_auction',`${id}.json`),
  ]) { try { return JSON.parse(readFileSync(p,'utf8')) } catch {} }
  return null
}
const anchor = findScorecard('1529279')
const VALID_FROM = anchor?.info?.dates?.[0] ?? '2026-04-25'
console.log(`Cutoff date: ${VALID_FROM}  (${anchor ? 'from scorecard' : 'fallback'})\n`)

// ── post-midseason rosters (prices in lakhs = Cr × 100) ───────────────────────
// Names normalised from CSV (fixed typos, trailing spaces, comma-in-name, etc.)
const SQUADS = {
  "AD's Molestors": [
    { name: "Tristan Stubbs",          price_lakhs: 1300 },
    { name: "Angkrish Raghuvanshi",    price_lakhs: 1300 },
    { name: "Arshdeep Singh",          price_lakhs: 1200 },
    { name: "Nitish Kumar Reddy",      price_lakhs:  800 },
    { name: "Washington Sundar",       price_lakhs:  700 },
    { name: "T Natarajan",             price_lakhs:  500 },
    { name: "Donovan Ferreira",        price_lakhs:  150 },
    { name: "Riyan Parag",             price_lakhs: 1500 },
    { name: "Shivang Kumar",           price_lakhs:  800 },
    { name: "Brijesh Sharma",          price_lakhs: 1000 },
    { name: "Tushar Deshpande",        price_lakhs:  100 },
    { name: "Sherfane Rutherford",     price_lakhs: 1400 },
    { name: "Mukesh Chaudhary",        price_lakhs:  800 },
    { name: "Jitesh Sharma",           price_lakhs: 1200 },
    { name: "Mitchell Marsh",          price_lakhs: 2100 },
  ],
  "ARM XI": [
    { name: "Yashasvi Jaiswal",        price_lakhs: 2500 },
    { name: "Rajat Patidar",           price_lakhs: 2100 },
    { name: "Dewald Brevis",           price_lakhs: 2000 },
    { name: "Noor Ahmad",              price_lakhs: 1500 },
    { name: "Rashid Khan",             price_lakhs: 1300 },
    { name: "Pat Cummins",             price_lakhs: 1200 },
    { name: "Ravi Bishnoi",            price_lakhs: 1000 },
    { name: "Josh Hazlewood",          price_lakhs:  500 },
    { name: "Jamie Overton",           price_lakhs:  300 },
    { name: "Rahul Tewatia",           price_lakhs:  100 },
    { name: "Finn Allen",              price_lakhs:  300 },
    { name: "Ramandeep Singh",         price_lakhs:  300 },
    { name: "Dushmantha Chameera",     price_lakhs:  300 },
    { name: "Rovman Powell",           price_lakhs: 1300 },
    { name: "Avesh Khan",              price_lakhs:  300 },
  ],
  "Cheap as Chips ft SM": [
    { name: "Ravindra Jadeja",         price_lakhs: 1300 },
    { name: "Mohammed Shami",          price_lakhs:  950 },
    { name: "Yuzvendra Chahal",        price_lakhs:  950 },
    { name: "Tilak Varma",             price_lakhs:  950 },
    { name: "Varun Chakravarthy",      price_lakhs:  850 },
    { name: "Quinton de Kock",         price_lakhs:  850 },
    { name: "Jofra Archer",            price_lakhs:  850 },
    { name: "Mohammed Siraj",          price_lakhs:  700 },
    { name: "Matheesha Pathirana",     price_lakhs:  150 },
    { name: "Rinku Singh",             price_lakhs:  500 },
    { name: "Digvesh Rathi",           price_lakhs:  700 },
    { name: "Ayush Badoni",            price_lakhs: 1000 },
    { name: "Marco Jansen",            price_lakhs: 1400 },
    { name: "Jason Holder",            price_lakhs:  300 },
    { name: "Hardik Pandya",           price_lakhs: 3600 },
  ],
  "Jhurani Giants": [
    { name: "Ishan Kishan",            price_lakhs: 2600 },
    { name: "Sanju Samson",            price_lakhs: 2100 },
    { name: "Kuldeep Yadav",           price_lakhs: 1600 },
    { name: "David Miller",            price_lakhs:  800 },
    { name: "Bhuvneshwar Kumar",       price_lakhs:  750 },
    { name: "Shardul Thakur",          price_lakhs:  300 }, // rebought at 3 Cr (was 1.5)
    { name: "Sarfaraz Khan",           price_lakhs:  100 },
    { name: "Gurjapneet Singh",        price_lakhs:  100 },
    { name: "Tim Seifert",             price_lakhs:  800 },
    { name: "Nicholas Pooran",         price_lakhs: 1500 },
    { name: "AM Ghazanfar",            price_lakhs:  900 },
    { name: "Eshan Malinga",           price_lakhs:  700 },
    { name: "Mitchell Santner",        price_lakhs: 1300 },
    { name: "Ajinkya Rahane",          price_lakhs: 1300 },
    // Note: Shardul Thakur appears twice in source CSV (1.5 Cr + 3 Cr); kept 3 Cr only
  ],
  "Kazzatax Abhimeow": [
    { name: "Virat Kohli",             price_lakhs: 5000 },
    { name: "Vaibhav Suryavanshi",     price_lakhs: 2500 }, // CSV: "Vaibhav Sooryavanshi"
    { name: "Mitchell Starc",          price_lakhs: 1200 },
    { name: "Sameer Rizvi",            price_lakhs:  950 },
    { name: "MS Dhoni",                price_lakhs:  500 },
    { name: "Venkatesh Iyer",          price_lakhs:  500 },
    { name: "M Shahrukh Khan",         price_lakhs:  400 },
    { name: "Kwena Maphaka",           price_lakhs:  200 },
    { name: "Deepak Chahar",           price_lakhs:  300 }, // CSV had "Deepak,Chahar"
    { name: "Himmat Singh",            price_lakhs:  500 },
    { name: "Nehal Wadhera",           price_lakhs: 1000 },
    { name: "Liam Livingstone",        price_lakhs:  100 },
    { name: "Mayank Yadav",            price_lakhs:  300 },
    { name: "Mohsin Khan",             price_lakhs:  400 },
    { name: "Harshal Patel",           price_lakhs:  400 },
  ],
  "Mirza's Menaces": [
    { name: "Heinrich Klaasen",        price_lakhs: 2500 },
    { name: "Priyansh Arya",           price_lakhs: 1600 },
    { name: "Jos Buttler",             price_lakhs: 1600 },
    { name: "Prasidh Krishna",         price_lakhs: 1100 },
    { name: "Shivam Dube",             price_lakhs:  850 },
    { name: "Cameron Green",           price_lakhs:  850 },
    { name: "Will Jacks",              price_lakhs:  600 },
    { name: "Anshul Kamboj",           price_lakhs:  250 },
    { name: "Rishabh Pant",            price_lakhs: 1800 }, // CSV: "Risabh Pant"
    { name: "Sandeep Sharma",          price_lakhs:  100 },
    { name: "Mukesh Kumar",            price_lakhs:  400 },
    { name: "Shashank Singh",          price_lakhs:  600 },
    { name: "Phil Salt",               price_lakhs: 1800 },
    { name: "Rasikh Salam",            price_lakhs:  400 },
    { name: "Karthik Sharma",          price_lakhs:  600 },
  ],
  "Moizzy's Ravers": [
    { name: "Sai Sudharsan",           price_lakhs: 2500 },
    { name: "Travis Head",             price_lakhs: 2100 },
    { name: "Suyash Sharma",           price_lakhs:  800 },
    { name: "Kartik Sharma",           price_lakhs:  500 },
    { name: "Josh Inglis",             price_lakhs:  250 },
    { name: "Harpreet Brar",           price_lakhs:  100 },
    { name: "Aiden Markram",           price_lakhs: 2000 }, // CSV: "Aiden Makram"
    { name: "Mukul Choudhary",         price_lakhs:  600 },
    { name: "Salil Arora",             price_lakhs:  200 },
    { name: "Romario Shepherd",        price_lakhs:  700 },
    { name: "Rehan Ahmed",             price_lakhs:  300 },
    { name: "Ashwani Kumar",           price_lakhs: 1000 },
    { name: "Vipraj Nigam",            price_lakhs:  400 }, // CSV: "Vipraj Nigan"
    { name: "Ruturaj Gaikwad",         price_lakhs: 2500 },
    { name: "Glenn Phillips",          price_lakhs: 1100 }, // CSV: "Glenn Philips"
  ],
  "Nig8 XI": [
    { name: "Shubman Gill",            price_lakhs: 3500 },
    { name: "Shreyas Iyer",            price_lakhs: 3300 },
    { name: "Krunal Pandya",           price_lakhs: 1200 },
    { name: "Marcus Stoinis",          price_lakhs:  600 },
    { name: "Xavier Bartlett",         price_lakhs:  500 },
    { name: "Cooper Connolly",         price_lakhs:  100 },
    { name: "Trent Boult",             price_lakhs:  500 },
    { name: "Ashok Sharma",            price_lakhs:  900 },
    { name: "Ashutosh Sharma",         price_lakhs:  100 },
    { name: "Shimron Hetmyer",         price_lakhs: 1300 },
    { name: "Rachin Ravindra",         price_lakhs:  100 },
    { name: "Karthik Tyagi",           price_lakhs:  800 }, // CSV: "Kathik Tyagi"
    { name: "Jasprit Bumrah",          price_lakhs: 1800 },
    { name: "Mayank Markande",         price_lakhs:  100 },
    { name: "Matt Henry",              price_lakhs:  100 },
  ],
  "Super Capitals": [
    { name: "Abhishek Sharma",         price_lakhs: 2600 },
    { name: "KL Rahul",                price_lakhs: 2100 },
    { name: "Tim David",               price_lakhs:  950 },
    { name: "Devdutt Padikkal",        price_lakhs:  800 },
    { name: "Dhruv Jurel",             price_lakhs:  850 },
    { name: "Nitish Rana",             price_lakhs:  750 },
    { name: "Kagiso Rabada",           price_lakhs:  600 },
    { name: "Akeal Hosein",            price_lakhs:  250 },
    { name: "Suryakumar Yadav",        price_lakhs: 2300 },
    { name: "Axar Patel",              price_lakhs: 2400 },
    { name: "Abhishek Porel",          price_lakhs:  700 },
    { name: "George Linde",            price_lakhs:  200 },
    { name: "Yashraj Punja",           price_lakhs:  100 },
    { name: "Akash Madhwal",           price_lakhs:  100 }, // CSV: "Aakash Madwal"
    { name: "Anukul Roy",              price_lakhs:  300 },
  ],
  "Turd XI": [
    { name: "Rohit Sharma",            price_lakhs: 2250 },
    { name: "Prabhsimran Singh",       price_lakhs: 2000 },
    { name: "Aniket Verma",            price_lakhs:  600 },
    { name: "Naman Dhir",              price_lakhs:  400 },
    { name: "Vaibhav Arora",           price_lakhs:  300 },
    { name: "Jacob Bethell",           price_lakhs:  200 },
    { name: "Aquib Nabi",              price_lakhs:  600 }, // CSV: "Aquib Navi"
    { name: "Sunil Narine",            price_lakhs: 1900 },
    { name: "Vijaykumar Vyshak",       price_lakhs: 1300 },
    { name: "Nandre Burger",           price_lakhs: 1500 },
    { name: "Sakib Hussain",           price_lakhs:  800 }, // CSV: "Sakib Husaain"
    { name: "Prince Yadav",            price_lakhs: 1300 },
    { name: "Praful Hinge",            price_lakhs:  400 },
    { name: "Pathum Nissanka",         price_lakhs: 1000 },
    { name: "Harsh Dubey",             price_lakhs:  500 },
  ],
}

// ── helpers ───────────────────────────────────────────────────────────────────
function norm(s) { return s.toLowerCase().trim().replace(/[''`]/g,"'").replace(/\s+/g,' ') }

function matchTeam(csvName, dbTeams) {
  const n = norm(csvName)
  return dbTeams.find(t => norm(t.name) === n)
      ?? dbTeams.find(t => norm(t.name).replace(/[^a-z0-9]/g,'').includes(n.replace(/[^a-z0-9]/g,'').slice(0,6)))
}

function parseName(n) {
  const parts = n.trim().split(/\s+/)
  const surname = parts[parts.length - 1]
  const prefix  = parts.slice(0,-1).join(' ')
  const isAbbrev = /^[A-Z]{1,4}$/.test(prefix.replace(/\s/g,''))
  return { surname, prefix, initials: isAbbrev ? prefix.replace(/\s/g,'').split('') : [] }
}

function matchPlayer(name, dbPlayers) {
  const lo = norm(name)
  const exact = dbPlayers.find(p => norm(p.name) === lo)
  if (exact) return { player: exact, reason: 'exact' }

  const { surname, initials } = parseName(name)
  const sl = norm(surname)
  const byS = dbPlayers.filter(p => norm(p.name.split(/\s+/).at(-1)) === sl)

  if (byS.length === 1) return { player: byS[0], reason: 'surname-only' }
  if (initials.length > 0 && byS.length > 0) {
    const byI = byS.filter(p => {
      const fw = p.name.split(/\s+/)
      return initials.every((c,i) => fw[i]?.[0]?.toUpperCase() === c)
    })
    if (byI.length === 1) return { player: byI[0], reason: 'initials+surname' }
    const byFirst = byS.filter(p => p.name[0].toUpperCase() === initials[0])
    if (byFirst.length === 1) return { player: byFirst[0], reason: 'first-initial' }
  }
  return null
}

// ── fetch DB state ────────────────────────────────────────────────────────────
const [dbTeams, dbPlayers, activeEntries] = await Promise.all([
  get('teams?select=id,name'),
  get('players?select=id,name&limit=1000'),
  get('squad_entries?status=eq.active&select=id,player_id,team_id,price_lakhs'),
])

console.log(`DB: ${dbTeams.length} teams, ${dbPlayers.length} players, ${activeEntries.length} active squad entries\n`)

// ── process each team's roster ────────────────────────────────────────────────
const postMidseasonPlayerIds = new Set()
let updated = 0, inserted = 0, skipped = 0, unmatched = 0

for (const [teamCsvName, players] of Object.entries(SQUADS)) {
  const team = matchTeam(teamCsvName, dbTeams)
  if (!team) { console.error(`✗ Team not found: "${teamCsvName}"`); continue }

  // Deduplicate by name (keep last = higher-priced midseason entry)
  const seen = new Map()
  for (const p of players) seen.set(norm(p.name), p)

  for (const { name, price_lakhs } of seen.values()) {
    const match = matchPlayer(name, dbPlayers)
    if (!match) {
      console.warn(`  ? No player match: "${name}" (${teamCsvName})`)
      unmatched++
      continue
    }
    const { player } = match
    postMidseasonPlayerIds.add(player.id)

    const existing = activeEntries.find(e => e.player_id === player.id)
    const tag = DRY_RUN ? '[dry] ' : ''

    if (existing && existing.team_id === team.id) {
      // Same team — update price if changed
      if (existing.price_lakhs !== price_lakhs) {
        console.log(`  ${tag}~ ${player.name} (${teamCsvName}) price ${existing.price_lakhs} → ${price_lakhs}`)
        if (!DRY_RUN) await patch(`squad_entries?id=eq.${existing.id}`, { price_lakhs })
        updated++
      } else {
        skipped++
      }
    } else if (existing && existing.team_id !== team.id) {
      // Moved to new team
      const oldTeam = dbTeams.find(t => t.id === existing.team_id)
      console.log(`  ${tag}→ ${player.name}  ${oldTeam?.name ?? '?'} → ${team.name}  (${price_lakhs/100} Cr, from ${VALID_FROM})`)
      if (!DRY_RUN) {
        await patch(`squad_entries?id=eq.${existing.id}`, { status: 'traded' })
        await post('squad_entries', { team_id: team.id, player_id: player.id, price_lakhs, auction_type: 'mini', status: 'active', valid_from_date: VALID_FROM })
      }
      inserted++
    } else {
      // New entry (wasn't in any squad)
      console.log(`  ${tag}+ ${player.name} → ${team.name}  (${price_lakhs/100} Cr, from ${VALID_FROM})`)
      if (!DRY_RUN) {
        await post('squad_entries', { team_id: team.id, player_id: player.id, price_lakhs, auction_type: 'mini', status: 'active', valid_from_date: VALID_FROM })
      }
      inserted++
    }
  }
}

// ── release players not in any post-midseason roster ─────────────────────────
console.log()
for (const entry of activeEntries) {
  if (!postMidseasonPlayerIds.has(entry.player_id)) {
    const p = dbPlayers.find(p => p.id === entry.player_id)
    const t = dbTeams.find(t => t.id === entry.team_id)
    console.log(`  ${DRY_RUN ? '[dry] ' : ''}✗ Released: ${p?.name ?? entry.player_id} (from ${t?.name ?? '?'})`)
    if (!DRY_RUN) await patch(`squad_entries?id=eq.${entry.id}`, { status: 'released' })
  }
}

console.log(`\n${DRY_RUN?'[dry-run] ':''}Done.  inserted/moved: ${inserted}  price-updated: ${updated}  unchanged: ${skipped}  unmatched: ${unmatched}`)
if (DRY_RUN) console.log('Re-run without --dry-run to apply.')
