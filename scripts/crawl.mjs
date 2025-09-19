// scripts/crawl.mjs
// Henter seneste run fra Apify, merger med gamle jobs.json og gemmer

import fs from "node:fs/promises";

const ACTOR_ID = process.env.ACTOR_ID; // fx "apify/facebook-groups-scraper"
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30;

// Helper
const agoDays = (iso) =>
  !iso ? Infinity : (Date.now() - new Date(iso).getTime()) / 86400000;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function run() {
  // 1) hent seneste run
  const runs = await fetchJson(
    `https://api.apify.com/v2/actor-tasks/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1&desc=true`
  );
  if (!runs.data?.items?.length) throw new Error("No runs found");

  const lastRun = runs.data.items[0];
  const datasetId = lastRun.defaultDatasetId;

  // 2) hent dataset items fra run
  const items = await fetchJson(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );

  // 3) load gamle jobs hvis findes
  let old = [];
  try {
    old = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8")).items || [];
  } catch {}

  // 4) merge nye + gamle (unik per url+postDate)
  const map = new Map();
  [...items, ...old].forEach((r) => {
    const text = r.text || r.postText || "";
    const link = r.postUrl || r.url || r.facebookUrl || "";
    const date =
      r.creation_time ||
      r.publish_time ||
      r.timestamp ||
      r.date ||
      r.createdAt ||
      null;
    if (!text || !link || !date) return;

    const key = link + "_" + date;
    if (agoDays(date) > MAX_DAYS_KEEP) return;

    map.set(key, {
      url: link,
      title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
      summary: text,
      country: "EU",
      source: "FacebookGroups",
      posted_at: new Date(date * 1000).toISOString(), // unix → iso
      fetched_at: new Date().toISOString(),
    });
  });

  const merged = [...map.values()].sort(
    (a, b) => new Date(b.posted_at) - new Date(a.posted_at)
  );

  const out = {
    updatedAt: new Date().toISOString(),
    items: merged,
  };

  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", OUTPUT_PATH, "with", merged.length, "items");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
