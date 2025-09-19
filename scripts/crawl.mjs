// scripts/crawl.mjs
// Node 18+ har global fetch – vi må IKKE importere 'node-fetch'.
// Denne fil henter seneste SUCCEEDED run for Actor'en
// 'apify~facebook-groups-scraper', samler dataset-items og skriver
// dem til radar/jobs.json uden at overskrive 'fetched_at' på gamle opslag.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------- Konfiguration ---------
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = process.env.ACTOR_ID || "apify~facebook-groups-scraper"; // kan sættes i workflow, men default er korrekt
const OUTPUT_FILE = path.join(__dirname, "..", "radar", "jobs.json");

if (!APIFY_TOKEN) {
  console.error("Missing APIFY_TOKEN (GitHub Actions → Secrets).");
  process.exit(1);
}

const API = "https://api.apify.com/v2";

// Lille helper til fetch
async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "user-agent": "selfcast-deck/1.0",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}\n${text}`);
  }
  return res.json();
}

// Hent seneste SUCCEEDED run for Actor
async function getLatestSucceededRun() {
  const url =
    `${API}/acts/${encodeURIComponent(ACTOR_ID)}/runs` +
    `?status=SUCCEEDED&limit=1&desc=true&token=${encodeURIComponent(APIFY_TOKEN)}`;
  const data = await fetchJson(url);
  const run = data?.data?.items?.[0];
  if (!run) throw new Error("No SUCCEEDED runs found for actor.");
  return run;
}

// Hent alle dataset items fra run
async function getDatasetItems(datasetId) {
  const url =
    `${API}/datasets/${datasetId}/items` +
    `?clean=true&format=json&token=${encodeURIComponent(APIFY_TOKEN)}`;
  const items = await fetchJson(url);
  if (!Array.isArray(items)) {
    throw new Error("Dataset items response is not an array.");
  }
  return items;
}

// Robust udtræk af post-dato (Unix → ISO)
function pickPostedAt(rec) {
  // typiske felter i Facebook Groups Scraper:
  // creation_time (unix seconds), post_context.publish_time (unix seconds),
  // publishedTime (ISO), timestamp (unix)
  const unixCandidates = [
    rec?.creation_time,
    rec?.timestamp,
    rec?.post_context?.publish_time,
  ].filter((v) => typeof v === "number" && isFinite(v) && v > 0);

  if (unixCandidates.length) {
    // Apify returnerer ofte sekunder – hvis tallet ligner millisekunder, normaliser
    const raw = unixCandidates[0];
    const ms = raw > 3e12 ? raw : raw * 1000;
    return new Date(ms).toISOString();
  }

  const isoCandidates = [rec?.publishedTime, rec?.published_time, rec?.time]
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d));
  if (isoCandidates.length) return isoCandidates[0].toISOString();

  return null; // fallback håndteres længere nede
}

// Trim titel ud fra tekst
function makeTitle(text = "") {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "(no title)";
  return t.length > 120 ? t.slice(0, 117) + "…" : t;
}

// Lav ét konsistent job-objekt
function normalize(rec) {
  const url =
    rec?.postUrl ||
    rec?.url ||
    rec?.permalink_url ||
    rec?.permalink ||
    rec?.link ||
    "";

  const summary =
    rec?.message ||
    rec?.text ||
    rec?.content ||
    rec?.body ||
    rec?.post_text ||
    "";

  const posted_at = pickPostedAt(rec) || null;

  return {
    url,
    title: makeTitle(summary),
    country: "EU", // hvis du vil, kan vi senere udlede dette smartere
    source: "FacebookGroups",
    summary: summary || "",
    posted_at, // reel post-dato (stabil)
    // fetched_at bliver sat i merge med eksisterende data
  };
}

// Læs eksisterende jobs.json hvis findes
async function readExisting() {
  try {
    const raw = await readFile(OUTPUT_FILE, "utf8");
    const json = JSON.parse(raw);
    return json && typeof json === "object" ? json : { updatedAt: null, items: [] };
  } catch {
    return { updatedAt: null, items: [] };
  }
}

// Merge så KUN nye opslag får ny fetched_at
function mergeItems(oldItems, newItems) {
  const byUrl = new Map(oldItems.map((it) => [it.url, it]));
  const out = [];

  for (const it of newItems) {
    if (!it.url) continue; // kræver url for at kunne de-dupe
    const existing = byUrl.get(it.url);
    if (existing) {
      // bevar fetched_at og alt det gamle, men opdatér felter der giver mening
      out.push({
        ...existing,
        title: it.title || existing.title,
        country: it.country || existing.country,
        source: it.source || existing.source,
        summary: it.summary || existing.summary,
        posted_at: it.posted_at || existing.posted_at,
      });
      byUrl.delete(it.url);
    } else {
      out.push({
        ...it,
        fetched_at: new Date().toISOString(),
      });
    }
  }

  // Hvis du vil bevare gamle ting, der ikke længere findes i feedet, så push dem her:
  for (const rest of byUrl.values()) out.push(rest);

  // Sortér nyeste først efter posted_at (eller fetched_at som fallback)
  out.sort((a, b) => {
    const da = new Date(a.posted_at || a.fetched_at || 0).getTime();
    const db = new Date(b.posted_at || b.fetched_at || 0).getTime();
    return db - da;
  });

  return out;
}

async function main() {
  console.log("→ Fetching latest SUCCEEDED run…");
  const run = await getLatestSucceededRun();
  console.log(`  runId: ${run.id}, dataset: ${run.defaultDatasetId}`);

  console.log("→ Fetching dataset items…");
  const rawItems = await getDatasetItems(run.defaultDatasetId);
  const normalized = rawItems.map(normalize).filter((x) => x.url);

  console.log(`  ${normalized.length} items normalised.`);

  console.log("→ Reading existing jobs.json…");
  const existing = await readExisting();

  console.log("→ Merging items…");
  const merged = mergeItems(existing.items || [], normalized);

  console.log("→ Writing radar/jobs.json…");
  const outDir = path.dirname(OUTPUT_FILE);
  await mkdir(outDir, { recursive: true });

  const out = {
    updatedAt: new Date().toISOString(), // hvornår VI har hentet data
    items: merged,
  };
  await writeFile(OUTPUT_FILE, JSON.stringify(out, null, 2), "utf8");

  console.log(`✓ Done. Wrote ${merged.length} items.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
