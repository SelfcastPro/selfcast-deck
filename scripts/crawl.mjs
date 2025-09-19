// scripts/crawl.mjs

// Helper til at hente JSON med native fetch
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

// Miljøvariabler
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN er ikke sat. Tjek dine GitHub Actions secrets.");
  process.exit(1);
}

// Actor ID for Facebook Groups Scraper (tjek din Apify console for det korrekte ID)
const ACTOR_ID = "apify~facebook-groups-scraper";

// URL til at køre aktøren
const START_RUN_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`;
// URL til at hente de seneste runs
const RUNS_URL = `https://api.apify.com/v2/actor-tasks/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

const fs = await import("fs");

// Start et nyt run
async function startRun() {
  console.log("🚀 Starter Apify run…");
  const res = await fetchJson(START_RUN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      maxItems: 20,
      // her kan du tilføje input fra dit Apify UI hvis nødvendigt
    }),
  });
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
  const res = await fetchJson(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );
  return res;
}

// Gem jobs.json
async function saveJobs(items) {
  const outPath = "radar/jobs.json";
  const data = {
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
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Gemte ${items.length} opslag i ${outPath}`);
}

// Main
(async () => {
  try {
    const run = await startRun();
    const runResult = await waitForRun(run.id);

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
