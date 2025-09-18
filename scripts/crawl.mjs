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
const MAX_AGE_DAYS = 30; // behold max 30 dage gamle opslag

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

        const link = r.postUrl || r.url || r.facebookUrl || s.url;
        const posted = r.date || r.createdAt || null;
        const postedDate = posted ? new Date(posted) : null;

        // Skip hvis ældre end 30 dage
        if (postedDate && (Date.now() - postedDate.getTime())/86400000 > MAX_AGE_DAYS) {
          skipped++;
          continue;
        }

        items.push({
          url: link,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: s.country,
          source: s.source,
          posted_at: postedDate ? postedDate.toISOString() : null,
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
