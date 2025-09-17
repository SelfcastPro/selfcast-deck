// scripts/crawl.mjs
// Crawler til CASTING RADAR – gem ALT (ingen keyword-filter)

import { parse } from "node-html-parser";

const SOURCES = [
  { url: "https://www.backstage.com/casting/open-casting-calls/london-uk/", country: "UK", source: "Backstage" },
  { url: "https://www.backstage.com/magazine/region/europe/", country: "EU", source: "Backstage" },
  { url: "https://www.mandy.com/uk/jobs/actors/", country: "UK", source: "Mandy" },
  { url: "https://www.mandy.com/jobs/europe/actors/", country: "EU", source: "Mandy" },
  { url: "https://en.stagepool.com/", country: "EU", source: "StagePool" },
  { url: "https://www.productionbase.co.uk/film-tv-jobs", country: "UK", source: "ProductionBase" }
];

const OUTPUT_PATH = "radar/jobs/live/jobs.json";

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function scrapeSource(s) {
  const html = await fetchText(s.url);
  const root = parse(html);

  const items = [];

  // links
  const links = root.querySelectorAll("a");
  for (const a of links) {
    const title = (a.text || "").trim();
    const href = a.getAttribute("href");
    if (!title || !href) continue;

    const absUrl = href.startsWith("http") ? href : new URL(href, s.url).toString();

    items.push({
      url: absUrl,
      title,
      summary: null,
      country: s.country || null,
      source: s.source,
      tags: "",
      fetched_at: new Date().toISOString()
    });
  }

  // overskrifter
  const h2s = root.querySelectorAll("h2");
  for (const h of h2s) {
    const title = (h.text || "").trim();
    if (!title) continue;

    items.push({
      url: s.url,
      title,
      summary: null,
      country: s.country || null,
      source: s.source,
      tags: "",
      fetched_at: new Date().toISOString()
    });
  }

  return items;
}

async function run() {
  const allItems = [];
  let success = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      const items = await scrapeSource(s);
      allItems.push(...items);
      success += items.length;
      await delay(1000);
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, fail, total: SOURCES.length },
    items: allItems
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts, "items:", allItems.length);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
