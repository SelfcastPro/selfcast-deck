import fetch from "node-fetch";
import fs from "fs";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "apify~facebook-groups-scraper";   // Facebook Groups Scraper actor
const DATASET_KEY = "default"; // dataset alias "default"

async function run() {
  console.log("▶ Starting Apify crawl...");

  // Start a new run of the Actor
  const startUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`;
  const runRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Input kan tilpasses her hvis du vil sætte grupper direkte fra koden
    }),
  });

  const runData = await runRes.json();
  if (!runRes.ok) {
    throw new Error(`Failed to start actor: ${JSON.stringify(runData)}`);
  }

  const runId = runData.data.id;
  console.log(`▶ Run started: ${runId}`);

  // Poll indtil run er færdigt
  let status = "RUNNING";
  while (status === "RUNNING" || status === "READY") {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const json = await res.json();
    status = json.data.status;
    console.log(`▶ Status: ${status}`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Actor run failed: ${status}`);
  }

  // Hent dataset items
  const datasetUrl = `https://api.apify.com/v2/datasets/${runId}/${DATASET_KEY}/items?token=${APIFY_TOKEN}&format=json`;
  const dataRes = await fetch(datasetUrl);
  const items = await dataRes.json();

  console.log(`▶ Got ${items.length} items`);

  // Gem lokalt til live/jobs.json
  fs.writeFileSync("public/live/jobs.json", JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2));
  console.log("✅ Data saved to public/live/jobs.json");
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
