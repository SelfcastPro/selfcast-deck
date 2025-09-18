// scripts/clean-jobs.mjs
// Renser jobs.json: behold kun opslag de sidste 30 dage
// og marker opslag som "fresh" hvis de er ≤ 7 dage gamle.

const INPUT_PATH = "radar/jobs/live/jobs.json";
const OUTPUT_PATH = "radar/jobs/live/jobs.json";

const MAX_DAYS_KEEP = 30;  // behold max 30 dage
const FRESH_DAYS = 7;      // marker opslag som "nye" hvis ≤ 7 dage

function agoDays(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

async function run() {
  const fs = await import("node:fs/promises");

  // læs eksisterende jobs.json
  let raw;
  try {
    raw = await fs.readFile(INPUT_PATH, "utf8");
  } catch (err) {
    console.error("Kunne ikke læse jobs.json:", err.message);
    process.exit(1);
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error("jobs.json er ikke gyldig JSON:", err.message);
    process.exit(1);
  }

  const items = (json.items || []).filter(r => {
    const date = r.posted_at || r.fetched_at;
    return agoDays(date) <= MAX_DAYS_KEEP;
  });

  // marker fresh
  items.forEach(r => {
    const date = r.posted_at || r.fetched_at;
    r.isFresh = agoDays(date) <= FRESH_DAYS;
  });

  const out = {
    updatedAt: new Date().toISOString(),
    counts: {
      before: json.items ? json.items.length : 0,
      after: items.length
    },
    items
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(`Cleaned jobs.json: ${out.counts.before} → ${out.counts.after}`);
}

run().catch(err => {
  console.error("clean-jobs fail:", err);
  process.exit(1);
});
