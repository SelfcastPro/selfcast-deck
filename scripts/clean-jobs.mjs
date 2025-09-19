// scripts/clean-jobs.mjs
import fs from "node:fs/promises";

const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30;
const agoDays = (iso) => (!iso ? Infinity : (Date.now() - new Date(iso).getTime()) / 86400000);

(async () => {
  const buf = await fs.readFile(OUTPUT_PATH, "utf8");
  const json = JSON.parse(buf);
  const map = new Map();

  for (const it of json.items || []) {
    if (!it.id) continue;
    if (!map.has(it.id)) map.set(it.id, it);
  }

  const items = Array.from(map.values())
    .filter((x) => agoDays(x.postDate || x.importedAt) <= MAX_DAYS_KEEP)
    .sort((a, b) => new Date(b.postDate || b.importedAt) - new Date(a.postDate || a.importedAt));

  const out = { ...json, updatedAt: new Date().toISOString(), items };
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("Cleaned. Items:", items.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
