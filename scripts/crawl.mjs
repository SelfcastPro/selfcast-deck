// scripts/crawl.mjs
// Crawler til CASTING RADAR — henter seneste dataset fra Apify Facebook Groups Scraper
// og gemmer resultater i radar/jobs.json

import fs from "node:fs/promises";

// === Konfiguration ===
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "apify~facebook-groups-scraper"; // brug actor navnet

if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN er ikke sat. Tjek GitHub Actions secrets.");
  process.exit(1);
}

// Helper
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Hent seneste succesfulde run
async function fetchLatestRun() {
  console.log("→ Henter seneste run fra Apify…");
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1&status=SUCCEEDED&desc=true`;
  const res = await fetchJson(url);
  if (!res.data || res.data.length === 0) throw new Error("Ingen succesfulde runs fundet.");
  return res.data[0];
}

// Hent dataset
async function fetchDataset(datasetId) {
  console.log(`→ Henter dataset ${datasetId}…`);
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`;
  return fetchJson(url);
}

// Gem jobs
async function saveJobs(items) {
  const outPath = "radar/jobs.json";
  const data = {
    updatedAt: new Date().toISOString(),
    items: items.map((x, i) => ({
      id: x.id || `apify_${i}`,
      title: x.title || "(no title)",
      summary: x.text || "",
      country: "EU",
      source: "FacebookGroups",
      url: x.url || x.postUrl || "",
      posted_at: x.creation_time
        ? new Date(x.creation_time * 1000).toISOString()
        : null,
      fetched_at: new Date().toISOString(),
    })),
  };
  await fs.mkdir("radar", { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✓ Gemte ${data.items.length} opslag i ${outPath}`);
}

// === Main ===
(async () => {
  try {
    const run = await fetchLatestRun();
    console.log("  runId:", run.id, "dataset:", run.defaultDatasetId);

    const items = await fetchDataset(run.defaultDatasetId);
    console.log(`  ${items.length} items hentet.`);

    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
})();
