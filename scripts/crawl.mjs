// scripts/crawl.mjs
// Selfcast – CASTING RADAR crawler
// Henter de nyeste Apify runs (Facebook Groups Scraper), samler alle items,
// udtrækker korrekt post-dato og gemmer i radar/jobs/live/jobs.json

import fs from "node:fs/promises";

const APIFY_TOKEN = process.env.APIFY_TOKEN || "";
if (!APIFY_TOKEN) {
  console.error("Missing APIFY_TOKEN (GitHub Actions → Secrets) — aborting.");
  process.exit(1);
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// EDIT ME: Sæt dit actor-id her (ses i Apify URL’en /actors/<ID>/runs)
const ACTOR_ID = "2chN8UQcH1CfxLRNE"; // <-- skift til dit eget ID
// Hvor mange seneste runs vil vi samle fra (typisk 5–10 er rigeligt)
const RUNS_TO_FETCH = 6;
// Hvor vi skriver output
const OUTPUT_PATH = "radar/jobs/live/jobs.json";
// Behold opslag i arkivet i X dage
const MAX_DAYS_KEEP = 30;
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

const agoDays = (iso) => (!iso ? Infinity : (Date.now() - new Date(iso).getTime()) / 86400000);

const esc = (s) => (s || "").toString();

/** Hent seneste runs for actor */
async function fetchActorRuns(actorId, limit = RUNS_TO_FETCH) {
  const url =
    `https://api.apify.com/v2/actors/${actorId}/runs?` +
    new URLSearchParams({
      token: APIFY_TOKEN,
      limit: String(limit),
      desc: "true", // nyeste først
      status: "SUCCEEDED",
    });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Runs HTTP ${res.status}`);
  const json = await res.json();
  return json?.data?.items || [];
}

/** Hent dataset items for et run (bruger run.defaultDatasetId) */
async function fetchDatasetItems(datasetId) {
  // Brug clean=true så vi får plain JSON felter hvor muligt
  const url =
    `https://api.apify.com/v2/datasets/${datasetId}/items?` +
    new URLSearchParams({
      token: APIFY_TOKEN,
      format: "json",
      clean: "true",
    });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dataset ${datasetId} HTTP ${res.status}`);
  return await res.json();
}

/** Prøv at udtrække en stabil post-dato fra mange mulige felter */
function extractPostedAt(r) {
  // 1) Direkte felter
  const direct =
    r.date ||
    r.timestamp ||
    r.createdAt ||
    r.lastActivityTime ||
    r.postDate ||
    r.posted_at ||
    r.time;

  if (direct) {
    const d = new Date(direct);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  // 2) UNIX sekunder / ms
  const unixCandidates = [
    r.creation_time,
    r.created_time,
    r.created_time_ms,
    r.publish_time,
  ].filter((v) => typeof v === "number");

  for (const ts of unixCandidates) {
    const ms = ts > 1e12 ? ts : ts * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  // 3) tracking.publish_time i debug_info (kan være JSON-string)
  try {
    const trackingStr =
      r?.debug_info?.tracking || r?.tracking || r?.meta?.tracking || null;
    if (trackingStr && typeof trackingStr === "string") {
      const obj = JSON.parse(trackingStr);
      const pub = obj?.post_context?.publish_time ?? obj?.publish_time;
      if (typeof pub === "number") {
        const ms = pub > 1e12 ? pub : pub * 1000;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
    }
  } catch {
    // ignorer
  }

  // 4) Sidste nød: brug run-tidspunktet hvis findes i posten
  if (r.fetched_at) return r.fetched_at;

  // 5) Fallback = nu (så det aldrig er tomt)
  return new Date().toISOString();
}

/** Find bedste link vi kan klikke til original-opslag */
function extractUrl(r) {
  return (
    r.postUrl ||
    r.url ||
    r.permalink_url ||
    r.permalink ||
    r.facebookUrl ||
    r.link ||
    ""
  );
}

/** Lav en kort titel (første linje / de første ~80 tegn) */
function makeTitle(text = "") {
  const trimmed = text.trim().split(/\n/)[0] || text.trim();
  const t = trimmed.slice(0, 80);
  return t + (trimmed.length > 80 ? "…" : "");
}

/** Lav en stabil nøgle til deduplikering, når url mangler */
function fallbackKey(r) {
  const uid =
    r.user?.id ||
    r.userId ||
    r.authorId ||
    r.ownerId ||
    r.pageId ||
    r.groupId ||
    "";
  const txt = esc(r.text || r.postText || r.message || "").slice(0, 160);
  return `${uid}::${txt}`.toLowerCase();
}

async function readOld() {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    const json = JSON.parse(raw);
    return json.items || [];
  } catch {
    return [];
  }
}

async function run() {
  const start = Date.now();
  const items = [];

  // 1) Hent de seneste runs
  const runs = await fetchActorRuns(ACTOR_ID, RUNS_TO_FETCH);

  // 2) Hent items for hvert run
  for (const run of runs) {
    const ds = run.defaultDatasetId;
    if (!ds) continue;
    try {
      const rows = await fetchDatasetItems(ds);
      for (const r of rows) {
        const text = esc(r.text || r.postText || r.message || "");
        const url = extractUrl(r);
        const posted_at = extractPostedAt(r);

        items.push({
          id: r.id || r.post_id || url || fallbackKey(r),
          url,
          title: makeTitle(text) || "(no title)",
          summary: text,
          country: "EU",
          source: "FacebookGroups",
          posted_at,
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("Dataset fetch fail:", ds, e.message);
    }
  }

  // 3) Merge med gammel fil (bevar posted_at hvis vi allerede har set posten)
  const prev = await readOld();

  // Brug Map til at dedupe – primært på url, ellers fallbackKey/id
  const byKey = new Map();

  // Først læg gamle ind (så vi bevarer deres posted_at)
  for (const it of prev) {
    const key = it.url || it.id || fallbackKey(it);
    byKey.set(key, it);
  }

  // Tilføj/merge nye
  for (const it of items) {
    const key = it.url || it.id || fallbackKey(it);
    const old = byKey.get(key);
    if (old) {
      // bevar original posted_at hvis den findes og ligner en rigtig dato
      const oldDate = old.posted_at && !Number.isNaN(new Date(old.posted_at).getTime());
      const posted_at = oldDate ? old.posted_at : it.posted_at;
      byKey.set(key, { ...old, ...it, posted_at });
    } else {
      byKey.set(key, it);
    }
  }

  // 4) Smid meget gamle ud (30 dage)
  const merged = Array.from(byKey.values()).filter(
    (x) => agoDays(x.posted_at || x.fetched_at) <= MAX_DAYS_KEEP
  );

  // 5) Sortér nyeste først (frontend kan også sortere, men rart at have)
  merged.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

  // 6) Skriv fil
  const out = {
    updatedAt: new Date().toISOString(),
    counts: {
      runs: runs.length,
    },
    items: merged,
  };

  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log(
    `OK – wrote ${OUTPUT_PATH} · ${merged.length} items · ${((Date.now() - start) / 1000).toFixed(1)}s`
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
