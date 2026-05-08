// Bridges Cricsheet player registry IDs to the players table in Supabase.
// Reads all scorecard JSONs to collect every (cricsheet_id, cricsheet_name) pair,
// then matches them to players by name (exact → initials+surname → surname-only),
// and writes the cricsheet_id back to players.cricsheet_id.
//
// Run ONCE before import-scorecards.mjs, and re-run whenever new players appear.
// Run: node scripts/map-player-names.mjs
// Add --dry-run to preview without writing.

import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

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

async function get(path) {
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function patch(table, id, body) {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${table}/${id} → ${res.status}: ${await res.text()}`)
}

// ── collect all (cricsheet_id → name) pairs from scorecard JSONs ──────────────
function findJsonFiles(dir) {
  const out = []
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) out.push(...findJsonFiles(full))
      else if (e.name.endsWith('.json')) out.push(full)
    }
  } catch { /* dir doesn't exist */ }
  return out
}

const SCORECARD_DIR = join('supabase', 'fixtures', 'scorecards')
const files = findJsonFiles(SCORECARD_DIR)
if (files.length === 0) {
  console.error(`No scorecard JSONs found in ${SCORECARD_DIR}`)
  process.exit(1)
}

// Map: cricsheet_id (8-char hex) → last seen name
const cricsheetMap = new Map()
for (const file of files) {
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const registry = data.info?.registry?.people ?? {}
  for (const [name, id] of Object.entries(registry))
    cricsheetMap.set(id, name)
}
console.log(`Collected ${cricsheetMap.size} unique Cricsheet player IDs from ${files.length} scorecards\n`)

// ── fetch all DB players ──────────────────────────────────────────────────────
const players = await get('players?select=id,name,cricsheet_id&limit=1000')
console.log(`Fetched ${players.length} players from DB\n`)

// ── name matching helpers ─────────────────────────────────────────────────────
function normalize(s) { return s.toLowerCase().replace(/[^a-z\s]/g, '').trim() }

// Parse "TM Head" → { initials: ['T','M'], surname: 'Head', isAbbrev: true }
// Parse "Abhishek Sharma" → { initials: [], surname: 'Sharma', isAbbrev: false }
function parseCricsheetName(name) {
  const parts = name.trim().split(/\s+/)
  const surname = parts[parts.length - 1]
  const prefix  = parts.slice(0, -1).join(' ')
  // Abbreviated if prefix is all caps letters (no spaces or only single/double chars)
  const isAbbrev = parts.length > 1 && /^[A-Z]{1,4}$/.test(prefix.replace(/\s/g, ''))
  const initials = isAbbrev ? prefix.replace(/\s/g, '').split('') : []
  return { surname, prefix, initials, isAbbrev }
}

function matchToDb(cricName, dbPlayers) {
  const low = normalize(cricName)

  // 1. Exact (case-insensitive)
  const exact = dbPlayers.find(p => normalize(p.name) === low)
  if (exact) return { player: exact, confidence: 'high', reason: 'exact' }

  const { surname, initials, isAbbrev } = parseCricsheetName(cricName)
  const surnLow = normalize(surname)

  // 2. Surname match candidates
  const surnMatches = dbPlayers.filter(p => {
    const parts = p.name.split(/\s+/)
    return normalize(parts[parts.length - 1]) === surnLow
  })

  if (isAbbrev && initials.length > 0) {
    // 3. Initials + surname: "TM Head" → T=Travis, M=(middle)?, Head
    const initialMatches = surnMatches.filter(p => {
      const pParts = p.name.split(/\s+/).slice(0, -1) // all parts except surname
      if (pParts.length === 0) return false
      const pFirstInitials = pParts.map(w => w[0].toUpperCase())
      // Must match: first initial must match first letter of first name component
      return initials.every((init, i) => pFirstInitials[i]?.toUpperCase() === init)
    })
    if (initialMatches.length === 1)
      return { player: initialMatches[0], confidence: 'high', reason: 'initials+surname' }
    // Partial initial match: first initial only
    const firstInitMatch = surnMatches.filter(p => {
      const firstName = p.name.split(/\s+/)[0]
      return firstName[0].toUpperCase() === initials[0]
    })
    if (firstInitMatch.length === 1)
      return { player: firstInitMatch[0], confidence: 'medium', reason: 'first-initial+surname' }
  }

  // 4. Unique surname
  if (surnMatches.length === 1)
    return { player: surnMatches[0], confidence: 'low', reason: 'surname-only' }

  return null
}

// ── match and apply ───────────────────────────────────────────────────────────
// Only consider players without a cricsheet_id already set (don't overwrite manual mappings)
const unmappedDb = players.filter(p => !p.cricsheet_id)
const alreadyMapped = players.filter(p => p.cricsheet_id)
console.log(`Already mapped: ${alreadyMapped.length}  |  Need mapping: ${unmappedDb.length}\n`)

const toUpdate   = []
const uncertain  = []
const unmatched  = []

for (const [cricId, cricName] of cricsheetMap) {
  // Skip if already mapped to this cricsheet_id
  if (alreadyMapped.some(p => p.cricsheet_id === cricId)) continue

  const match = matchToDb(cricName, unmappedDb)
  if (!match) {
    unmatched.push({ cricId, cricName })
    continue
  }
  const entry = { cricId, cricName, dbName: match.player.name, dbId: match.player.id, ...match }
  if (match.confidence === 'low') uncertain.push(entry)
  else toUpdate.push(entry)
}

console.log(`High/medium confidence matches: ${toUpdate.length}`)
console.log(`Low confidence (surname-only):  ${uncertain.length}`)
console.log(`No match found:                 ${unmatched.length}\n`)

if (toUpdate.length > 0) {
  console.log('── Applying high/medium confidence mappings ────────────────────────────')
  for (const e of toUpdate) {
    const tag = DRY_RUN ? '[dry-run] ' : ''
    console.log(`  ${tag}${e.cricName.padEnd(28)} → ${e.dbName.padEnd(28)} (${e.reason})`)
    if (!DRY_RUN) await patch('players', e.dbId, { cricsheet_id: e.cricId })
  }
  console.log()
}

if (uncertain.length > 0) {
  console.log('── Surname-only matches — review manually before applying ───────────────')
  for (const e of uncertain)
    console.log(`  ${e.cricName.padEnd(28)} → ${e.dbName.padEnd(28)} (cricsheet_id: ${e.cricId})`)
  console.log()
  console.log('To apply these, re-run with --include-uncertain')
  if (process.argv.includes('--include-uncertain') && !DRY_RUN) {
    for (const e of uncertain) await patch('players', e.dbId, { cricsheet_id: e.cricId })
    console.log('Applied.')
  }
  console.log()
}

if (unmatched.length > 0) {
  console.log('── No match found — add manually via Supabase or seed-league.mjs ────────')
  for (const e of unmatched)
    console.log(`  ${e.cricName.padEnd(28)}  cricsheet_id: ${e.cricId}`)
  console.log()
}

if (DRY_RUN) console.log('[dry-run complete — no DB writes made]')
else console.log('Done.')
