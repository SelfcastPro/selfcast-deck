// scripts/crawl.mjs
// Crawler til CASTING RADAR — henter data fra Apify JSON feed (Facebook grupper)
// og skriver resultater til radar/jobs/live/jobs.json

// ==== KONFIG ====
const SOURCES = [
  {
    url: "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&view=overview&clean=true",
    country: "EU",
    source: "FacebookGroups"
  }
];

const OUTPUT_PATH = "radar/jobs/live/jobs.json";

// ==== HJÆLPERE ====
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function cleanText(txt) {
  if (!txt) return "";
  return txt.replace(/\s+/g, " ").trim();
}

// ==== HOVEDKØRSEL ====
async function run() {
  const items = [];
  let success = 0, skipped = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      const rows = await fetchJson(s.url);

      for (const r of rows) {
        const text = cleanText(r.text || r.postText || r.message || "");
        if (!text) { skipped++; continue; }

        // Brug permalink eller postUrl hvis tilgængelig
        const link = r.permalinkUrl || r.postUrl || r.url || s.url;

        // Titel = første 80 tegn
        const title = text.slice(0, 80) + (text.length > 80 ? "…" : "");
        // Snippet = op til 500 tegn
        const snippet = text.slice(0, 500);

        // Brug postens egen dato hvis den findes
        const rawDate = r.date || r.publishedTime || r.publishedAt || r.createdAt || null;
        let fetchedAt = new Date().toISOString();
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            fetchedAt = d.toISOString();
          }
        }

        items.push({
          url: link,
          title,
          summary: snippet,
          country: s.country,
          source: s.source,
          fetched_at: fetchedAt
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
    items: items.sort((a, b) => (b.fetched_at || "").localeCompare(a.fetched_at || ""))
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts, "items:", items.length);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
