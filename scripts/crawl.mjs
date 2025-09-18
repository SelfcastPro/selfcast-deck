// scripts/crawl.mjs
// Simpelt crawler-script til CASTING RADAR
// Henter fra Apify JSON feed (Facebook grupper) og skriver til jobs.json

const SOURCES = [
  {
    url: "https://api.apify.com/v2/datasets/YOUR_NEW_DATASET_ID/items?format=json&clean=true",
    country: "EU",
    source: "FacebookGroups"
  }
];

const OUTPUT_PATH = "radar/jobs/live/jobs.json";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function run() {
  const items = [];

  for (const s of SOURCES) {
    try {
      const rows = await fetchJson(s.url);

      for (const r of rows) {
        const text = r.text || "";
        if (!text) continue;

        items.push({
          url: r.postUrl || r.url || r.facebookUrl || s.url,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: s.country,
          source: s.source,
          posted_at: r.timestamp || r.date || r.createdAt || null,
          fetched_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    items
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "with", items.length, "jobs");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
