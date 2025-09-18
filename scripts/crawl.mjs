// scripts/crawl.mjs
// Henter seneste Facebook-gruppeopslag fra Apify (last-run feed)
// og skriver til radar/jobs/live/jobs.json

// ===== Konfig =====
const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30;         // behold kun opslag <= 30 dage
const DEFAULT_UI_WINDOW_DAYS = 7; // bruges blot til info i UI-teksten

// Byg en stabil URL der altid peger på seneste RUN for DIN actor
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID;
const APIFY_TOKEN    = process.env.APIFY_TOKEN;

// Fallback: hvis secrets mangler, kan du midlertidigt sætte en fast dataset-ID her:
const FALLBACK_DATASET_URL = "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&view=overview&clean=true";

// Kilde(r) – vi holder listen åben hvis du vil tilføje flere feeds senere
const SOURCES = [
  {
    // Hvis secrets findes, brug last-run; ellers brug fallback dataset
    url: (APIFY_ACTOR_ID && APIFY_TOKEN)
      ? `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs/last/dataset/items?format=json&view=overview&clean=true&token=${APIFY_TOKEN}`
      : FALLBACK_DATASET_URL,
    country: "EU",
    source: "FacebookGroups"
  }
];

// ===== Hjælpere =====
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function agoDays(iso) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (isNaN(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v && typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normalizeDate(row, fallbackIso) {
  // Apify kan levere flere mulige felter – vi tager det første som kan parses
  // typiske felter set i dine data: createdAt, lastActivityTime, date, timestamp
  const cand = pickFirst(
    row.createdAt,
    row.lastActivityTime,
    row.date,
    row.timestamp
  );
  if (cand && !isNaN(Date.parse(cand))) return new Date(cand).toISOString();
  return fallbackIso; // fallback til fetch-tidspunkt
}

async function fetchJson(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { redirect: "follow" });
    if (res.ok) return await res.json();
    if (i === retries) throw new Error(`HTTP ${res.status} for ${url}`);
    await delay(1000 * (i + 1));
  }
}

// ===== Hovedkørsel =====
async function run() {
  const items = [];
  let success = 0, skipped = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      const rows = await fetchJson(s.url);

      for (const r of rows || []) {
        const text = pickFirst(r.text, r.postText);
        if (!text) { skipped++; continue; }

        // Brug hentetid som sidste fallback-dato
        const fetchedAt = new Date().toISOString();
        const postedAt  = normalizeDate(r, fetchedAt);

        // Kassér hvis ældre end 30 dage (så jobs.json ikke vokser uendeligt)
        if (agoDays(postedAt) > MAX_DAYS_KEEP) { skipped++; continue; }

        // Link til selve posten (prioritér post/permalink)
        const link = pickFirst(r.postUrl, r.permalinkUrl, r.url, r.facebookUrl);
        if (!link) { skipped++; continue; }

        items.push({
          url: link,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: s.country,
          source: s.source,
          posted_at: postedAt,
          fetched_at: fetchedAt
        });
        success++;
      }
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  // Sortér nyeste først (efter posted_at, fallback fetched_at)
  items.sort((a, b) => (b.posted_at || b.fetched_at || "").localeCompare(a.posted_at || a.fetched_at || ""));

  const out = {
    updatedAt: new Date().toISOString(),
    info: {
      windowHintDays: DEFAULT_UI_WINDOW_DAYS,
      sourceType: "apify-last-run",
    },
    counts: { success, skipped, fail, total: SOURCES.length },
    items
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUTPUT_PATH, "=>", out.counts, "items:", items.length);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
