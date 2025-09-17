// scripts/crawl.mjs
// Crawler til CASTING RADAR (GitHub Actions). Filtrerer hårdt på domæner + nøgleord
// og skriver resultater til radar/data/jobs.json

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

// Kilder vi scanner (start small – vi udvider senere)
const SOURCES = [
  { url: "https://www.backstage.com/casting/open-casting-calls/london-uk/", country: "UK", source: "Backstage" },
  { url: "https://www.backstage.com/magazine/region/europe/", country: "EU", source: "Backstage" },
  { url: "https://www.mandy.com/uk/jobs/actors/", country: "UK", source: "Mandy" },
  { url: "https://www.mandy.com/jobs/europe/actors/", country: "EU", source: "Mandy" },
  { url: "https://en.stagepool.com/", country: "EU", source: "StagePool" },
  { url: "https://www.productionbase.co.uk/film-tv-jobs", country: "UK", source: "ProductionBase" }
];

// Hvor output skal ligge i repoet:
const OUTPUT_PATH = "radar/data/jobs.json";

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

// Meget simpel titel/description-udtræk (nok til første filtrering)
function quickMeta(html) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || "").trim();
  return { title, summary: desc || title };
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

// ==== HOVEDKØRSEL ====
async function run() {
  const items = [];
  let success = 0, skipped = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      if (!allowed(s.url)) { skipped++; continue; }

      const html = await fetchText(s.url);
      const meta = quickMeta(html);
      const blob = `${meta.title} ${meta.summary}`;

      // Hårdt filter: kræv keyword-match
      if (!looksLikeCasting(blob)) { skipped++; continue; }

      items.push({
        url: s.url,
        title: meta.title || s.url,
        summary: meta.summary || null,
        country: s.country || null,
        source: s.source || hostnameOf(s.url),
        tags: KEYWORDS.filter(k => blob.toLowerCase().includes(k)).join(","),
        fetched_at: new Date().toISOString()
      });

      success++;
      await delay(500); // venlig rate-limit
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, fail, total: SOURCES.length },
    items
  };

  // Skriv filen ind i repoet (køres i Actions runner)
  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/data", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
