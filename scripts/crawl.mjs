// scripts/crawl.mjs

import fs from "fs";

// Helper til at hente JSON
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

// Miljøvariabler
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN er ikke sat");
  process.exit(1);
}

// Actor ID for Facebook Groups Scraper
const ACTOR_ID = "apify~facebook-groups-scraper";
const RUNS_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

async function getLatestRun() {
  console.log("→ Henter seneste run fra Apify…");
  const res = await fetchJson(RUNS_URL);
  const run = res.data?.items?.[0];
  if (!run) throw new Error("Ingen runs fundet for aktøren");
  return run;
}

async function fetchDataset(datasetId) {
  console.log("→ Henter dataset items…");
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`;
  return fetchJson(url);
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
      posted_at: x.creation_time
        ? new Date(x.creation_time * 1000).toISOString()
        : null,
      fetched_at: new Date().toISOString(),
    })),
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`✅ Gemte ${items.length} opslag i ${outPath}`);
}

function loadLastJobs() {
  try {
    const buf = fs.readFileSync("radar/jobs.json", "utf8");
    const json = JSON.parse(buf);
    console.log(`⚠️ Bruger fallback – beholdt ${json.items.length} gamle opslag`);
    return json.items || [];
  } catch {
    console.log("⚠️ Ingen tidligere jobs.json fundet");
    return [];
  }
}

(async () => {
  try {
    const run = await getLatestRun();
    const items = await fetchDataset(run.defaultDatasetId);
    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    console.log("→ Bruger fallback i stedet");
    const items = loadLastJobs();
    await saveJobs(items); // Gem igen, så updatedAt bliver frisk
  }
})();
