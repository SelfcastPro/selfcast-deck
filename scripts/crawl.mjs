import fs from "fs/promises";
import fetch from "node-fetch";

const ACTOR_ID = "2chN8UQcH1CfxLRNE";     // Dit faste Actor ID
const TOKEN = process.env.APIFY_TOKEN;    // Dit API token fra GitHub secrets
const PATH = "data/jobs.json";

async function fetchJobs() {
  const url = `https://api.apify.com/v2/actors/${ACTOR_ID}/runs/last/dataset/items?token=${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.statusText}`);
  const items = await res.json();

  const data = {
    updatedAt: new Date().toISOString(),
    items: items.map(it => ({
      url: it.url || "",
      title: it.title || "",
      summary: it.text || "",
      country: "EU",
      source: "FacebookGroups",
      posted_at: it.creation_time ? new Date(it.creation_time * 1000).toISOString() : null,
      fetched_at: new Date().toISOString()
    }))
  };

  await fs.writeFile(PATH, JSON.stringify(data, null, 2));
  console.log(`Saved ${data.items.length} jobs to ${PATH}`);
}

fetchJobs().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
