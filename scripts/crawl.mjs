// scripts/crawl.mjs
// Crawler til CASTING RADAR. Scraper lister af links fra kilder
// og skriver resultater til radar/jobs/live/jobs.json

import { parse } from "node-html-parser";

// ==== KONFIG ====
const ALLOWED_DOMAINS = [
  "backstage.com",
  "mandy.com",
  "stagepool.com",
  "productionbase.co.uk"
];

const KEYWORDS = [
  "casting call","audition","open call",
  "extras needed","models wanted","actors wanted",
  "film casting","commercial casting",
  "apply now","submissions","casting notice"
];

// Kilder vi scanner (starter her – kan udvides)
const SOURCES = [
  { url: "https://www.backstage.com/casting/open-casting-calls/london-uk/", country: "UK", source: "Backstage" },
  { url: "https://www.backstage.com/magazine/region/europe/", country: "EU", source: "Backstage" },
  { url: "https://www.mandy.com/uk/jobs/actors/", country: "UK", source: "Mandy" },
  { url: "https://www.mandy.com/jobs/europe/actors/", country: "EU", source: "Mandy" },
  { url: "https://en.stagepool.com/", country: "EU", source: "StagePool" },
  { url: "https://www.productionbase.co.uk/film-tv-jobs", country: "UK", source: "ProductionBase" }
];

// Hvor output skal ligge i repoet:
const OUTPUT_PATH = "radar/jobs/live/jobs.json";

// ==== HJÆLPERE ====
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function hostnameOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return ""; }
}

function allowed(url) {
  const host = hostnameOf(url);
  if (!host) return false;
  return ALLOWED_DOMAINS.some(d => host === d || host.endsWith("." + d));
}

function looksLikeCasting(text = "") {
  const hay = text.toLowerCase();
  return KEYWORDS.some(k => hay.includes(k));
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

// ==== SCRAPE FUNKTION ====
async function scrapeSource(s) {
  const html = await fetchText(s.url);
  const root = parse(html);

  // find links og overskrifter
  const links = root.querySelectorAll("a");
  const h2s = root.querySelectorAll("h2");

  const items = [];

  // Links
  for (const a of links) {
    const title = (a.text || "").trim();
    const href = a.getAttribute("href");
    if (!title || !href) continue;

    if (!looksLikeCasting(title)) continue; // kræv keyword

    const absUrl = href.startsWith("http") ? href : new URL(href, s.url).toString();

    items.push({
      url: absUrl,
      title,
      summary: null,
      country: s.country || null,
      source: s.source || hostnameOf(s.url),
      tags: KEYWORDS.filter(k => title.toLowerCase().includes(k)).join(","),
      fetched_at: new Date().toISOString()
    });
  }

  // H2 overskrifter (ofte jobtitler)
  for (const h of h2s) {
    const title = (h.text || "").trim();
    if (!title) continue;
    if (!looksLikeCasting(title)) continue;

    items.push({
      url: s.url,
      title,
      summary: null,
      country: s.country || null,
      source: s.source || hostnameOf(s.url),
      tags: KEYWORDS.filter(k => title.toLowerCase().includes(k)).join(","),
      fetched_at: new Date().toISOString()
    });
  }

  return items;
}

// ==== HOVEDKØRSEL ====
async function run() {
  const allItems = [];
  let success = 0, skipped = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      if (!allowed(s.url)) { skipped++; continue; }

      const items = await scrapeSource(s);
      if (items.length === 0) {
        skipped++;
      } else {
        success += items.length;
        allItems.push(...items);
      }

      await delay(1000); // venlig rate-limit
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, fail, total: SOURCES.length },
    items: allItems
  };

  // Skriv filen ind i repoet (køres i Actions runner)
  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts, "items:", allItems.length);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
