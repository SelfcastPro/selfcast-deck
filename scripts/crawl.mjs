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
const MAX_DAYS_KEEP = 30; // gem kun opslag fra de sidste 30 dage

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

        // find korrekt opslagstidspunkt
        const date = r.date || r.timestamp || r.createdAt || r.lastActivityTime || null;
        if (!date) { skipped++; continue; }

        // gem kun opslag de sidste 30 dage
        if (agoDays(date) > MAX_DAYS_KEEP) { skipped++; continue; }

        // brug det rigtige opslag-link
        const link = r.postUrl || r.url || r.facebookUrl || s.url;

        items.push({
          url: link,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: s.country,
          source: s.source,
          posted_at: date, // korrekt dato fra Apify feed
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
