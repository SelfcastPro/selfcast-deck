// scripts/crawl.mjs
// Henter Facebook casting posts fra Apify og gemmer dem i jobs.json

const SOURCES = [
  {
    url: "https://api.apify.com/v2/datasets/DITT_DATASET_ID/items?format=json",
    country: "EU",
    source: "FacebookGroups"
  }
];

const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30; // behold opslag max 30 dage

function agoDays(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function run() {
  const items = [];
  let success = 0, skipped = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      const rows = await fetchJson(s.url);

      for (const r of rows) {
        const text = r.text || r.postText || "";
        if (!text) { skipped++; continue; }

        // Find post dato – Apify kan returnere flere felter
        const date = r.date || r.timestamp || r.createdAt || r.lastActivityTime || null;
        if (!date) { skipped++; continue; }

        // Behold kun opslag < MAX_DAYS_KEEP
        if (agoDays(date) > MAX_DAYS_KEEP) { skipped++; continue; }

        items.push({
          url: r.postUrl || r.url || r.facebookUrl || s.url,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: s.country,
          source: s.source,
          posted_at: date,
          fetched_at: new Date().toISOString()
        });

        success++;
      }
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, fail, total: SOURCES.length },
    items
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
