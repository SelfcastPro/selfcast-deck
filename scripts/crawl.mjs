// scripts/crawl.mjs
// Crawler til CASTING RADAR — henter data fra Apify JSON feed (Facebook grupper)
// og skriver resultater til radar/jobs/live/jobs.json

const SOURCES = [
  {
    url: "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&view=overview&clean=true",
    country: "EU",
    source: "FacebookGroups"
  }
];

const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_NEW = 7;   // kun hent opslag nyere end 7 dage
const MAX_DAYS_KEEP = 30; // behold opslag i JSON i op til 30 dage

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

        // find dato med fallback
        const date = r.time || r.date || r.timestamp || r.createdAt || r.lastActivityTime || null;
        if (!date) { skipped++; continue; }

        const daysAgo = agoDays(date);

        // kun tilføj hvis opslag er nyere end 7 dage
        if (daysAgo > MAX_DAYS_NEW) { skipped++; continue; }

        // vælg link
        const link = r.postUrl || r.url || r.facebookUrl || s.url;

        items.push({
          url: link,
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

  // filtrer gamle entries væk (ældre end 30 dage)
  const finalItems = items.filter(r => agoDays(r.posted_at) <= MAX_DAYS_KEEP);

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, fail, total: SOURCES.length },
    items: finalItems
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
