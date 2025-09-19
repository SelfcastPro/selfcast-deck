// scripts/crawl.mjs
import fs from "fs";

// Hent APIFY token fra GitHub Actions secrets
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN mangler. Sæt den i GitHub Secrets.");
  process.exit(1);
}

// Actor ID for Facebook Groups Scraper
const ACTOR_ID = "apify~facebook-groups-scraper";

// Hjælper: fetch + error check
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// Start et nyt run
async function startRun() {
  console.log("🚀 Starter nyt Apify run…");
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`;
  const run = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxItems: 50 }),
  });
  return run.data;
}

// Vent på at run er færdigt
async function waitForRun(runId) {
  while (true) {
    const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`;
    const run = await fetchJson(url);
    console.log("⏳ Status:", run.data.status);
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.data.status)) {
      return run.data;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Hent dataset
async function fetchDataset(datasetId) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`;
  return await fetchJson(url);
}

// Gem til jobs.json
async function saveJobs(items) {
  const outPath = "radar/jobs.json";
  const out = {
    updatedAt: new Date().toISOString(),
    items: items.map((x) => ({
      id: x.id || x.url,
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
  fs.mkdirSync("radar", { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✅ Gemte ${out.items.length} opslag i ${outPath}`);
}

// Main
(async () => {
  try {
    const run = await startRun();
    const result = await waitForRun(run.id);

    if (result.status !== "SUCCEEDED") throw new Error("Run fejlede: " + result.status);

    const items = await fetchDataset(result.defaultDatasetId);
    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
})();
