// scripts/clean-jobs.mjs
// Engangs-rens af jobs.json — fjerner gamle eller ugyldige opslag

const INPUT = "radar/jobs/live/jobs.json";
const OUTPUT = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30;

function agoDays(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

async function run() {
  const fs = await import("node:fs/promises");

  let raw;
  try {
    raw = JSON.parse(await fs.readFile(INPUT, "utf8"));
  } catch (e) {
    console.error("Kunne ikke læse jobs.json:", e.message);
    process.exit(1);
  }

  const items = Array.isArray(raw.items) ? raw.items : raw;

  const cleaned = items.filter(r => {
    const date = r.posted_at;
    return date && agoDays(date) <= MAX_DAYS_KEEP;
  });

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { total: cleaned.length },
    items: cleaned
  };

  await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`Cleaned jobs.json — beholdt ${cleaned.length} opslag`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
