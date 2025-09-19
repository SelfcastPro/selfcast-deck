import fs from "fs/promises";
import fetch from "node-fetch";

const ACTOR_ID = "apify~facebook-groups-scraper";   // this stays constant
const TOKEN = process.env.APIFY_TOKEN;              // we pull from GitHub secrets

async function run() {
  if (!TOKEN) {
    throw new Error("APIFY_TOKEN is not set!");
  }

  // Start actor run
  const start = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // optional: add your input if needed, e.g. group URLs
    }),
  });
  const started = await start.json();
  if (!started.data) throw new Error("Failed to start actor: " + JSON.stringify(started));
  const runId = started.data.id;
  console.log("Started run", runId);

  // Poll until finished
  let status = "RUNNING", run;
  while (status === "RUNNING" || status === "READY") {
    await new Promise(r => setTimeout(r, 10000));
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${TOKEN}`);
    run = await res.json();
    status = run.data.status;
    console.log("Status:", status);
  }

  if (status !== "SUCCEEDED") {
    throw new Error("Run failed with status " + status);
  }

  // Fetch dataset items
  const datasetId = run.data.defaultDatasetId;
  const out = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${TOKEN}`);
  const items = await out.json();

  await fs.writeFile("data/jobs.json", JSON.stringify({
    updatedAt: new Date().toISOString(),
    items
  }, null, 2));

  console.log(`Saved ${items.length} jobs to data/jobs.json`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
