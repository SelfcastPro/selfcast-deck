// scripts/crawl.mjs
import fs from "fs";

// Hent token og Actor ID fra secrets
const token = process.env.APIFY_TOKEN;
const actorId = "apify~facebook-groups-scraper"; // Dit actor ID

if (!token) {
  console.error("❌ Missing APIFY_TOKEN in GitHub Secrets!");
  process.exit(1);
}

// Start actor run
async function run() {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Hvis du har specifikke inputs (fx dine FB links) kan de lægges her:
      // "startUrls": [{ "url": "https://www.facebook.com/groups/castings.berlin" }]
    }),
  });

  if (!res.ok) {
    console.error("❌ Failed to start actor:", res.status, await res.text());
    process.exit(1);
  }

  const { data } = await res.json();
  const runId = data.id;
  console.log(`🚀 Actor started: ${actorId}, runId=${runId}`);

  // Poll status indtil færdig
  let run;
  while (true) {
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const json = await poll.json();
    run = json.data;

    if (["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(run.status)) break;

    console.log(`⌛ Status: ${run.status}…`);
    await new Promise(r => setTimeout(r, 5000));
  }

  if (run.status !== "SUCCEEDED") {
    console.error(`❌ Actor run failed with status: ${run.status}`);
    process.exit(1);
  }

  console.log("✅ Actor finished successfully.");

  // Hent data fra dataset
  const datasetId = run.defaultDatasetId;
  const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
  const items = await datasetRes.json();

  console.log(`📥 Fetched ${items.length} items.`);

  // Gem til jobs.json
  fs.writeFileSync("radar/jobs.json", JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2));
  console.log("💾 Saved radar/jobs.json");
}

run().catch(err => {
  console.error("🔥 Error in crawl.mjs:", err);
  process.exit(1);
});
