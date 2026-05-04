// Dry-run matcher: maps user-supplied squad assignments to CricAPI player UUIDs
// using the local fixture. Prints matched + unmatched + duplicates.
// No DB writes.

import { readFileSync } from "node:fs";

const fixture = JSON.parse(
  readFileSync("supabase/fixtures/ipl_2026_squads.json", "utf8"),
);

// IPL short-name normalization: user's input uses RCB but CricAPI fixture uses RCBW
const IPL_ALIAS = { RCB: "RCBW" };

const SQUADS = [
  { team: "AD's Molestors", email: "akshat.dhawan@hotmail.com", players: [
    ["Zeeshan Ansari","SRH",4],["Arshdeep Singh","PBKS",12],["Shimron Hetmyer","RR",15],
    ["Abishek Porel","DC",7],["Mitchell Marsh","LSG",27],["Vipraj Nigam","DC",4.5],
    ["Tristan Stubbs","DC",13],["T Natarajan","DC",5],["Donovan Ferreira","RR",1.5],
    ["Jacob Bethell","RCB",12],["Washington Sundar","GT",7],["Nitish Kumar Reddy","SRH",8],
    ["Prashant Veer","CSK",9],["Angkrish Raghuvanshi","KKR",13],["Trent Boult","MI",12],
  ]},
  { team: "ARM XI", email: "PLACEHOLDER_arm@example.com", players: [
    ["Ben Dwarshuis","PBKS",2],["Rovman Powell","KKR",15],["Pat Cummins","SRH",12],
    ["Keshav Maharaj","MI",5],["Lhuan-dre Pretorius","RR",3],["Yashasvi Jaiswal","RR",25],
    ["Ravi Bishnoi","RR",10],["Jamie Overton","CSK",3],["Rajat Patidar","RCB",21],
    ["Josh Hazlewood","RCB",5],["Noor Ahmad","CSK",15],["Corbin Bosch","MI",1],
    ["Rashid Khan","GT",13],
  ]},
  { team: "Cheap as Chips ft SM", email: "PLACEHOLDER_chips@example.com", players: [
    ["Ajinkya Rahane","KKR",13],["Matheesha Pathirana","KKR",1.5],["Harshal Patel","SRH",8.5],
    ["Mohammed Siraj","GT",7],["Mohammed Shami","LSG",9.5],["Quinton de Kock","MI",8.5],
    ["Glenn Phillips","GT",9.5],["Tilak Varma","MI",9.5],["Jofra Archer","RR",8.5],
    ["Ravindra Jadeja","RR",13],["Varun Chakravarthy","KKR",8.5],["Ruturaj Gaikwad","CSK",20],
    ["Matt Henry","CSK",3.5],["Yuzvendra Chahal","PBKS",9.5],["Phil Salt","RCB",16],
  ]},
  { team: "Jhurani Giants", email: "Siddhant.jhurani@gmail.com", players: [
    ["Anuj Rawat","GT",1],["Ishan Kishan","SRH",26],["Sarfaraz Khan","CSK",1],
    ["Hardik Pandya","MI",25],["Kuldeep Yadav","DC",16],["Axar Patel","DC",20],
    ["Sanju Samson","CSK",21],["Gurjapneet Singh","CSK",1],["Anrich Nortje","LSG",1],
    ["Sherfane Rutherford","MI",5.5],["Bhuvneshwar Kumar","RCB",7.5],["David Miller","DC",8],
    ["Ayush Badoni","LSG",9],["Jason Holder","GT",5.5],
  ]},
  { team: "Kazzatax Abhimeow", email: "karan@armanagroup.com", players: [
    ["Arjun Tendulkar","LSG",1],["Prithvi Shaw","DC",1],["MS Dhoni","CSK",5],
    ["Mitchell Owen","PBKS",1],["Kwena Maphaka","RR",2],["Mitchell Starc","DC",12],
    ["Rachin Ravindra","KKR",3],["Venkatesh Iyer","RCB",5],["Vaibhav Sooryavanshi","RR",25],
    ["Tushar Deshpande","RR",4.5],["Virat Kohli","RCB",50],["M Shahrukh Khan","GT",4],
    ["Sameer Rizvi","DC",9.5],["Auqib Nabi","DC",11],
  ]},
  { team: "Mirza's Menaces", email: "alizaky@gmail.com", players: [
    ["Kamindu Mendis","SRH",2.5],["Yash Dayal","RCB",0.5],["Will Jacks","MI",6],
    ["Sandeep Sharma","RR",4.5],["Heinrich Klaasen","SRH",25],["Priyansh Arya","PBKS",16],
    ["Prasidh Krishna","GT",11],["Suryakumar Yadav","MI",25],["Abdul Samad","LSG",0.5],
    ["Shivam Dube","CSK",8.5],["Cameron Green","KKR",8.5],["Jos Buttler","GT",16],
    ["Anshul Kamboj","CSK",2.5],
  ]},
  { team: "Moizzy's Ravers", email: "Moiz17007@gmail.com", players: [
    ["Jitesh Sharma","RCB",11],["Tejasvi Dahiya","KKR",1],["Tom Banton","GT",2],
    ["Shivam Mavi","SRH",1],["Josh Inglis","LSG",2.5],["Ryan Rickelton","MI",3],
    ["Shashank Singh","PBKS",12],["Travis Head","SRH",21],["Finn Allen","KKR",19],
    ["Khaleel Ahmed","CSK",12],["Deepak Chahar","MI",5],["Kartik Sharma","CSK",5],
    ["Suyash Sharma","RCB",8],["Aiden Markram","LSG",20],
  ]},
  { team: "Nig8 XI", email: "PLACEHOLDER_nig8@example.com", players: [
    ["Shubman Gill","GT",35],["Umran Malik","KKR",1],["Ben Duckett","DC",10],
    ["Rinku Singh","KKR",8],["Jasprit Bumrah","MI",27],["Xavier Bartlett","PBKS",5],
    ["Krunal Pandya","RCB",12],["Lungi Ngidi","DC",10],["Marcus Stoinis","PBKS",6],
    ["Cooper Connolly","PBKS",1],["George Linde","LSG",1],["Shreyas Iyer","PBKS",33],
    ["Karun Nair","DC",1],
  ]},
  { team: "Super Capitals", email: "PLACEHOLDER_super@example.com", players: [
    ["Abhishek Sharma","SRH",26],["Sunil Narine","KKR",17],["Kagiso Rabada","GT",6],
    ["KL Rahul","DC",21],["Devdutt Padikkal","RCB",8],["Tim David","RCB",9.5],
    ["Liam Livingstone","SRH",7.5],["Nitish Rana","DC",7.5],["Pathum Nissanka","DC",5],
    ["Akash Madhwal","CSK",15],["Blessing Muzarabani","KKR",6.5],["Sai Sudharsan","GT",25],
    ["Digvesh Rathi","LSG",5],
  ]},
  { team: "Turd XI", email: "jasondazza@gmail.com", players: [
    ["Aniket Verma","SRH",6],["Sai Kishore","GT",11],["Harpreet Brar","PBKS",5.5],
    ["Ramandeep Singh","KKR",4],["Rohit Sharma","MI",22.5],["Ashutosh Sharma","DC",4.5],
    ["Naman Dhir","MI",4],["Nicholas Pooran","LSG",24],["Riyan Parag","RR",17],
    ["Vaibhav Arora","KKR",3],["Nehal Wadhera","PBKS",12],["Romario Shepherd","RCB",9.5],
    ["Mayank Yadav","LSG",1],["Prabhsimran Singh","PBKS",20],["Akeal Hosein","CSK",2.5],
    ["Tim Seifert","KKR",6],
  ]},
];

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Build lookup: byTeam[short] = [{id, name, normName}]
const byTeam = {};
for (const team of fixture.data) {
  byTeam[team.shortname] = team.players.map((p) => ({
    id: p.id,
    name: p.name,
    norm: normalize(p.name),
  }));
}

const matched = [];
const unmatched = [];

for (const squad of SQUADS) {
  for (const [name, iplShort, priceCr] of squad.players) {
    const cricapiShort = IPL_ALIAS[iplShort] ?? iplShort;
    const candidates = byTeam[cricapiShort];
    if (!candidates) {
      unmatched.push({ team: squad.team, name, iplShort, reason: `no players for IPL team ${cricapiShort}` });
      continue;
    }
    const norm = normalize(name);

    // 1. exact normalized match
    let hits = candidates.filter((c) => c.norm === norm);
    let strategy = "exact";

    // 2. starts-with (handles "Auqib Nabi" → "Auqib Nabi Dar")
    if (hits.length === 0) {
      hits = candidates.filter((c) => c.norm.startsWith(norm));
      strategy = "startsWith";
    }
    // 3. contains
    if (hits.length === 0) {
      hits = candidates.filter((c) => c.norm.includes(norm) || norm.includes(c.norm));
      strategy = "contains";
    }

    if (hits.length === 1) {
      matched.push({ team: squad.team, name, iplShort, priceCr, playerId: hits[0].id, cricapiName: hits[0].name, strategy });
    } else if (hits.length === 0) {
      unmatched.push({ team: squad.team, name, iplShort, reason: "no match" });
    } else {
      unmatched.push({ team: squad.team, name, iplShort, reason: `ambiguous: ${hits.map(h => h.name).join(", ")}` });
    }
  }
}

console.log(`Matched: ${matched.length} / ${matched.length + unmatched.length}`);
const fuzzy = matched.filter((m) => m.strategy !== "exact");
if (fuzzy.length) {
  console.log(`\nFuzzy matches (review these):`);
  for (const m of fuzzy) {
    console.log(`  ${m.team}: "${m.name}" → "${m.cricapiName}" [${m.strategy}]`);
  }
}
if (unmatched.length) {
  console.log(`\nUnmatched (${unmatched.length}):`);
  for (const u of unmatched) {
    console.log(`  ${u.team}: "${u.name}" (${u.iplShort}) — ${u.reason}`);
  }
}

// Detect double-allocations (one player on two teams)
const playerToTeams = {};
for (const m of matched) {
  if (!playerToTeams[m.playerId]) playerToTeams[m.playerId] = [];
  playerToTeams[m.playerId].push(m.team);
}
const duplicates = Object.entries(playerToTeams).filter(([, teams]) => teams.length > 1);
if (duplicates.length) {
  console.log(`\nDOUBLE-ALLOCATIONS:`);
  for (const [pid, teams] of duplicates) {
    const m = matched.find((x) => x.playerId === pid);
    console.log(`  ${m.cricapiName} → ${teams.join(", ")}`);
  }
}

// Per-team purse summary
console.log(`\nPer-team summary (purse = 150 Cr = 15000 lakhs):`);
for (const squad of SQUADS) {
  const teamMatches = matched.filter((m) => m.team === squad.team);
  const totalLakhs = teamMatches.reduce((s, m) => s + Math.round(m.priceCr * 100), 0);
  console.log(`  ${squad.team.padEnd(25)} ${String(teamMatches.length).padStart(2)} players, ${String(totalLakhs).padStart(5)} lakhs spent, ${String(15000 - totalLakhs).padStart(5)} remaining`);
}
