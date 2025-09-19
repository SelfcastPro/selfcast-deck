// scripts/crawl.mjs
import fs from "fs";

// Helper til at hente JSON med native fetch
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

// Miljøvariabler
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN mangler. Tjek GitHub Secrets.");
  process.exit(1);
}

// Actor ID for Facebook Groups Scraper
const ACTOR_ID = "apify~facebook-groups-scraper";

// URL til seneste runs
const RUNS_URL = `https://api.apify.com/v2/actor-runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

// Gem til radar/jobs/live/jobs.json
const OUT_DIR = "radar/jobs/live";
const OUT_FILE = `${OUT_DIR}/jobs.json`;

// Start et nyt run (valgfrit, kan udkommenteres hvis vi kun henter seneste)
async function startRun() {
  console.log("🚀 Starter Apify run…");
  const res = await fetchJson(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxItems: 50,
      }),
    }
  );
  return res.data;
}

// Vent på run status
async function waitForRun(runId) {
  console.log(`⏳ Venter på run: ${runId}`);
  while (true) {
    const res = await fetchJson(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const { status } = res.data;
    console.log(`   Status: ${status}`);
    if (["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(status)) {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Hent dataset fra run
async function fetchDataset(datasetId) {
  console.log("📥 Henter dataset…");
  return await fetchJson(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );
}

// Gem jobs.json
async function saveJobs(items) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
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
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`✅ Gemte ${out.items.length} opslag i ${OUT_FILE}`);
}

// Main
(async () => {
  try {
    console.log("→ Henter seneste run fra Apify…");
    const runsRes = await fetchJson(RUNS_URL);
    const latestRun = runsRes.data?.items?.[0];
    if (!latestRun) throw new Error("Ingen runs fundet i Apify!");

    let runResult = latestRun;
    if (runResult.status !== "SUCCEEDED") {
      runResult = await waitForRun(runResult.id);
    }
    if (runResult.status !== "SUCCEEDED") {
      throw new Error(`Run fejlede: ${runResult.status}`);
    }

    const datasetId = runResult.defaultDatasetId;
    const items = await fetchDataset(datasetId);

    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
})();
