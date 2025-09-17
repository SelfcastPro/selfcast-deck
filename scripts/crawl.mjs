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

        // Byg post link hvis muligt
        let link = r.postUrl || r.url || r.facebookUrl || s.url;
        if (!r.postUrl && r.facebookUrl && r.id) {
          // Ekstraher gruppe ID fra facebookUrl
          const groupMatch = r.facebookUrl.match(/groups\/(\d+)/);
          if (groupMatch) {
            link = `https://www.facebook.com/groups/${groupMatch[1]}/posts/${r.id}`;
          }
        }

        items.push({
          url: link,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: s.country,
          source: s.source,
          posted_at: r.date || r.createdAt || null,
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
