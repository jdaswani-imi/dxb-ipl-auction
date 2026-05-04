// Seeds the league: 2 stub players (replacements not in CricAPI), 10 league
// teams, and ~139 squad_entries. Idempotent on teams (upsert by name) and
// players (upsert by id); squad_entries are deleted-then-reinserted for the
// listed teams so reruns produce a clean state.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${t}`);
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

// ─── 1. Stub players (not in CricAPI) ───────────────────────────────────────
const STUB_PLAYERS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Keshav Maharaj",
    role: "Bowler",
    batting_style: "Right Handed Bat",
    bowling_style: "Left-arm orthodox",
    country: "South Africa",
    player_img: null,
    ipl_team_name: "Mumbai Indians",
    ipl_team_short: "MI",
    ipl_team_img: "https://g.cricapi.com/iapi/226-637852956375593901.png?w=48",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Akash Madhwal",
    role: "Bowler",
    batting_style: "Right Handed Bat",
    bowling_style: "Right-arm fast-medium",
    country: "India",
    player_img: null,
    ipl_team_name: "Chennai Super Kings",
    ipl_team_short: "CSK",
    ipl_team_img: "https://g.cricapi.com/iapi/108-637852956281470734.png?w=48",
  },
];

// ─── 2. Teams ───────────────────────────────────────────────────────────────
const TEAMS = [
  { name: "AD's Molestors",       owner_email: "akshat.dhawan@hotmail.com" },
  { name: "ARM XI",               owner_email: "PLACEHOLDER_arm@example.com" },
  { name: "Cheap as Chips ft SM", owner_email: "PLACEHOLDER_chips@example.com" },
  { name: "Jhurani Giants",       owner_email: "Siddhant.jhurani@gmail.com" },
  { name: "Kazzatax Abhimeow",    owner_email: "karan@armanagroup.com" },
  { name: "Mirza's Menaces",      owner_email: "alizaky@gmail.com" },
  { name: "Moizzy's Ravers",      owner_email: "Moiz17007@gmail.com" },
  { name: "Nig8 XI",              owner_email: "PLACEHOLDER_nig8@example.com" },
  { name: "Super Capitals",       owner_email: "PLACEHOLDER_super@example.com" },
  { name: "Turd XI",              owner_email: "jasondazza@gmail.com" },
];

// ─── 3. Squad assignments ──────────────────────────────────────────────────
// Each entry: [player name as user wrote it, IPL short, price in Cr]
const SQUADS = {
  "AD's Molestors": [
    ["Zeeshan Ansari","SRH",4],["Arshdeep Singh","PBKS",12],["Shimron Hetmyer","RR",15],
    ["Abishek Porel","DC",7],["Mitchell Marsh","LSG",27],["Vipraj Nigam","DC",4.5],
    ["Tristan Stubbs","DC",13],["T Natarajan","DC",5],["Donovan Ferreira","RR",1.5],
    ["Jacob Bethell","RCB",12],["Washington Sundar","GT",7],["Nitish Kumar Reddy","SRH",8],
    ["Prashant Veer","CSK",9],["Angkrish Raghuvanshi","KKR",13],["Trent Boult","MI",12],
  ],
  "ARM XI": [
    ["Ben Dwarshuis","PBKS",2],["Rovman Powell","KKR",15],["Pat Cummins","SRH",12],
    ["Keshav Maharaj","MI",5],["Lhuan-dre Pretorius","RR",3],["Yashasvi Jaiswal","RR",25],
    ["Ravi Bishnoi","RR",10],["Jamie Overton","CSK",3],["Rajat Patidar","RCB",21],
    ["Josh Hazlewood","RCB",5],["Noor Ahmad","CSK",15],["Corbin Bosch","MI",1],
    ["Rashid Khan","GT",13],
  ],
  "Cheap as Chips ft SM": [
    ["Ajinkya Rahane","KKR",13],["Matheesha Pathirana","KKR",1.5],["Harshal Patel","SRH",8.5],
    ["Mohammed Siraj","GT",7],["Mohammed Shami","LSG",9.5],["Quinton de Kock","MI",8.5],
    ["Glenn Phillips","GT",9.5],["Tilak Varma","MI",9.5],["Jofra Archer","RR",8.5],
    ["Ravindra Jadeja","RR",13],["Varun Chakravarthy","KKR",8.5],["Ruturaj Gaikwad","CSK",20],
    ["Matt Henry","CSK",3.5],["Yuzvendra Chahal","PBKS",9.5],["Phil Salt","RCB",16],
  ],
  "Jhurani Giants": [
    ["Anuj Rawat","GT",1],["Ishan Kishan","SRH",26],["Sarfaraz Khan","CSK",1],
    ["Hardik Pandya","MI",25],["Kuldeep Yadav","DC",16],["Axar Patel","DC",20],
    ["Sanju Samson","CSK",21],["Gurjapneet Singh","CSK",1],["Anrich Nortje","LSG",1],
    ["Sherfane Rutherford","MI",5.5],["Bhuvneshwar Kumar","RCB",7.5],["David Miller","DC",8],
    ["Ayush Badoni","LSG",9],["Jason Holder","GT",5.5],
  ],
  "Kazzatax Abhimeow": [
    ["Arjun Tendulkar","LSG",1],["Prithvi Shaw","DC",1],["MS Dhoni","CSK",5],
    ["Mitchell Owen","PBKS",1],["Kwena Maphaka","RR",2],["Mitchell Starc","DC",12],
    ["Rachin Ravindra","KKR",3],["Venkatesh Iyer","RCB",5],["Vaibhav Sooryavanshi","RR",25],
    ["Tushar Deshpande","RR",4.5],["Virat Kohli","RCB",50],["M Shahrukh Khan","GT",4],
    ["Sameer Rizvi","DC",9.5],["Auqib Nabi","DC",11],
  ],
  "Mirza's Menaces": [
    ["Kamindu Mendis","SRH",2.5],["Yash Dayal","RCB",0.5],["Will Jacks","MI",6],
    ["Sandeep Sharma","RR",4.5],["Heinrich Klaasen","SRH",25],["Priyansh Arya","PBKS",16],
    ["Prasidh Krishna","GT",11],["Suryakumar Yadav","MI",25],["Abdul Samad","LSG",0.5],
    ["Shivam Dube","CSK",8.5],["Cameron Green","KKR",8.5],["Jos Buttler","GT",16],
    ["Anshul Kamboj","CSK",2.5],
  ],
  "Moizzy's Ravers": [
    ["Jitesh Sharma","RCB",11],["Tejasvi Dahiya","KKR",1],["Tom Banton","GT",2],
    ["Shivam Mavi","SRH",1],["Josh Inglis","LSG",2.5],["Ryan Rickelton","MI",3],
    ["Shashank Singh","PBKS",12],["Travis Head","SRH",21],["Finn Allen","KKR",19],
    ["Khaleel Ahmed","CSK",12],["Deepak Chahar","MI",5],["Kartik Sharma","CSK",5],
    ["Suyash Sharma","RCB",8],["Aiden Markram","LSG",20],
  ],
  "Nig8 XI": [
    ["Shubman Gill","GT",35],["Umran Malik","KKR",1],["Ben Duckett","DC",10],
    ["Rinku Singh","KKR",8],["Jasprit Bumrah","MI",27],["Xavier Bartlett","PBKS",5],
    ["Krunal Pandya","RCB",12],["Lungi Ngidi","DC",10],["Marcus Stoinis","PBKS",6],
    ["Cooper Connolly","PBKS",1],["George Linde","LSG",1],["Shreyas Iyer","PBKS",33],
    ["Karun Nair","DC",1],
  ],
  "Super Capitals": [
    ["Abhishek Sharma","SRH",26],["Sunil Narine","KKR",17],["Kagiso Rabada","GT",6],
    ["KL Rahul","DC",21],["Devdutt Padikkal","RCB",8],["Tim David","RCB",9.5],
    ["Liam Livingstone","SRH",7.5],["Nitish Rana","DC",7.5],["Pathum Nissanka","DC",5],
    ["Akash Madhwal","CSK",15],["Blessing Muzarabani","KKR",6.5],["Sai Sudharsan","GT",25],
    ["Digvesh Rathi","LSG",5],
  ],
  "Turd XI": [
    ["Aniket Verma","SRH",6],["Sai Kishore","GT",11],["Harpreet Brar","PBKS",5.5],
    ["Ramandeep Singh","KKR",4],["Rohit Sharma","MI",22.5],["Ashutosh Sharma","DC",4.5],
    ["Naman Dhir","MI",4],["Mayank Yadav","LSG",1],["Prabhsimran Singh","PBKS",20],
    ["Nicholas Pooran","LSG",24],["Tim Seifert","KKR",6],["Riyan Parag","RR",17],
    ["Vaibhav Arora","KKR",3],["Nehal Wadhera","PBKS",12],["Romario Shepherd","RCB",9.5],
  ],
};

// User's "RCB" → CricAPI's "RCBW"
const IPL_ALIAS = { RCB: "RCBW" };

// Name → CricAPI canonical (for typos / formatting differences)
const NAME_OVERRIDES = {
  "philsalt": "philipsalt",
  "varunchakravarthy": "varunchakaravarthy",
  "digveshrathi": "digveshsinghrathi",
};

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// ─── Run ────────────────────────────────────────────────────────────────────
console.log("1/5  Upserting stub players…");
await rest("players?on_conflict=id", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(STUB_PLAYERS),
});

console.log("2/5  Upserting teams…");
const insertedTeams = await rest("teams?on_conflict=name", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify(TEAMS),
});
const teamByName = Object.fromEntries(insertedTeams.map((t) => [t.name, t.id]));

console.log("3/5  Backfilling owner_id for already-signed-up users…");
// The handle_new_user trigger only fires on NEW auth.users; backfill any
// existing profiles whose email matches a team.owner_email here.
const profiles = await rest("profiles?select=id,email");
const lookup = new Map(profiles.map((p) => [p.email.toLowerCase(), p.id]));
for (const t of insertedTeams) {
  const ownerId = t.owner_email ? lookup.get(t.owner_email.toLowerCase()) : null;
  if (ownerId && !t.owner_id) {
    await rest(`teams?id=eq.${t.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ owner_id: ownerId }),
    });
    console.log(`     paired ${t.name} → ${t.owner_email}`);
  }
}

console.log("4/5  Loading player roster (incl. stubs) for matching…");
const allPlayers = await rest("players?select=id,name,ipl_team_short");
const byTeam = {};
for (const p of allPlayers) {
  (byTeam[p.ipl_team_short] ??= []).push({ id: p.id, name: p.name, norm: norm(p.name) });
}

const squadRows = [];
const unmatched = [];
for (const [teamName, picks] of Object.entries(SQUADS)) {
  const team_id = teamByName[teamName];
  if (!team_id) throw new Error(`Team not found: ${teamName}`);
  for (const [name, iplShort, priceCr] of picks) {
    const cricapiShort = IPL_ALIAS[iplShort] ?? iplShort;
    const candidates = byTeam[cricapiShort] ?? [];
    const target = NAME_OVERRIDES[norm(name)] ?? norm(name);

    let hits = candidates.filter((c) => c.norm === target);
    if (hits.length === 0) hits = candidates.filter((c) => c.norm.startsWith(target));
    if (hits.length === 0) hits = candidates.filter((c) => c.norm.includes(target) || target.includes(c.norm));

    if (hits.length === 1) {
      squadRows.push({
        team_id,
        player_id: hits[0].id,
        price_lakhs: Math.round(priceCr * 100),
        auction_type: "main",
        status: "active",
      });
    } else {
      unmatched.push({ teamName, name, iplShort, hits: hits.map((h) => h.name) });
    }
  }
}
if (unmatched.length) {
  console.error("Unmatched players, aborting:");
  for (const u of unmatched) console.error("  ", u);
  process.exit(1);
}

console.log(`5/5  Resetting squad_entries for these teams and inserting ${squadRows.length} rows…`);
const teamIds = Object.values(teamByName).map((id) => `"${id}"`).join(",");
await rest(`squad_entries?team_id=in.(${teamIds})`, {
  method: "DELETE",
  headers: { Prefer: "return=minimal" },
});
await rest("squad_entries", {
  method: "POST",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify(squadRows),
});

console.log(`Done. Inserted ${squadRows.length} squad entries across ${Object.keys(SQUADS).length} teams.`);
