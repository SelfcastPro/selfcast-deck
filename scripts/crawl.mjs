// scripts/crawl.mjs
// Henter data fra Apify Facebook Groups Scraper og gemmer i jobs.json

const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30; // gem opslag i op til 30 dage

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
  const url = `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs/last/dataset/items?token=${process.env.APIFY_TOKEN}`;
  const rows = await fetchJson(url);

  const items = [];
  let success = 0, skipped = 0;

  for (const r of rows) {
    const text = r.text || r.postText || "";
    if (!text) { skipped++; continue; }

    // Dato – prøv at finde creation_time eller publish_time
    const date = r.creation_time || r.post_context?.publish_time || r.date || r.timestamp || null;
    if (!date) { skipped++; continue; }

    if (agoDays(date) > MAX_DAYS_KEEP) { skipped++; continue; }

    const link = r.postUrl || r.url || r.facebookUrl || r.id || "";

    items.push({
      url: link,
      title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
      summary: text,
      country: "EU",
      source: "FacebookGroups",
      posted_at: new Date(date * 1000).toISOString(), // unix → ISO
      fetched_at: new Date().toISOString()
    });

    success++;
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, total: rows.length },
    items
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts);
}

run().catch(err => {
  console.error("CRAWL FAILED:", err);
  process.exit(1);
});
