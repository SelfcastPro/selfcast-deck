// scripts/crawl.mjs
import fs from "node:fs/promises";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN er ikke sat. Tjek dine GitHub Actions secrets.");
  process.exit(1);
}

const ACTOR_ID = "apify~facebook-groups-scraper";

// Hent seneste runs
const RUNS_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?status=SUCCEEDED&desc=true&limit=1&token=${APIFY_TOKEN}`;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchDataset(datasetId) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`;
  return fetchJson(url);
}

async function run() {
  console.log("→ Henter seneste run fra Apify…");
  const runs = await fetchJson(RUNS_URL);

  // === Debug ===
  console.log("  🔎 API response:", JSON.stringify(runs, null, 2).slice(0, 500));

  const run = runs?.data?.items?.[0];
  if (!run) {
    throw new Error("Ingen SUCCEEDED runs fundet – tjek om du har kørt en task/actor manuelt i Apify.");
  }

  const { id: runId, defaultDatasetId } = run;
  console.log(`  ✅ runId: ${runId}, dataset: ${defaultDatasetId}`);

  console.log("→ Henter dataset items…");
  const items = await fetchDataset(defaultDatasetId);

  console.log(`  📊 Antal items hentet fra Apify: ${items.length}`);
  if (items.length > 0) {
    console.log("  🔎 Første item preview:", JSON.stringify(items[0], null, 2).slice(0, 500));
  }

  const outPath = "radar/jobs.json";
  const out = {
    updatedAt: new Date().toISOString(),
    items: items.map((x) => ({
      title: x.title || "(no title)",
      summary: x.text || "",
      country: "EU",
      source: "FacebookGroups",
      url: x.url || "",
      posted_at: x.creation_time
        ? new Date(x.creation_time * 1000).toISOString()
        : null,
      fetched_at: new Date().toISOString(),
    })),
  };

  await fs.mkdir("radar", { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log(`✓ Done. Wrote ${out.items.length} items to ${outPath}`);
}

run().catch((err) => {
  console.error("❌ Fejl under crawl:", err.message);
  process.exit(1);
});
