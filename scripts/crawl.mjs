// scripts/crawl.mjs
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN er ikke sat");
  process.exit(1);
}

const ACTOR_ID = "apify~facebook-groups-scraper"; 
const RUNS_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

const fs = await import("fs");

async function getLatestRun() {
  console.log("→ Henter seneste run fra Apify…");
  const res = await fetchJson(RUNS_URL);
  const run = res.data?.items?.[0];
  if (!run) throw new Error("Ingen runs fundet for aktøren");
  return run;
}

async function fetchDataset(datasetId) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`;
  const res = await fetchJson(url);
  return res;
}

async function saveJobs(items) {
  const outPath = "radar/jobs.json";
  const data = {
    updatedAt: new Date().toISOString(),
    items: items.map(x => ({
      title: x.title || "(no title)",
      summary: x.text || "",
      country: "EU",
      source: "FacebookGroups",
      url: x.url || "",
      posted_at: x.creation_time ? new Date(x.creation_time * 1000).toISOString() : null,
      fetched_at: new Date().toISOString(),
    })),
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Gemte ${items.length} opslag i ${outPath}`);
}

(async () => {
  try {
    const run = await getLatestRun();
    const items = await fetchDataset(run.defaultDatasetId);
    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
})();
