// scripts/crawl.mjs
import fs from "fs";

// Helper til at hente JSON med native fetch
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

// Miljøvariabler
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN mangler. Tjek GitHub Secrets.");
  process.exit(1);
}

// Actor ID for Facebook Groups Scraper
const ACTOR_ID = "apify~facebook-groups-scraper";

// URL til seneste runs
const RUNS_URL = `https://api.apify.com/v2/actor-runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

// Gem til radar/jobs/live/jobs.json
const OUT_DIR = "radar/jobs/live";
const OUT_FILE = `${OUT_DIR}/jobs.json`;

/* ---------- Hjælpere ---------- */

// Flatten indlejrede records fra Apify
const flattenRecords = (input) => {
  const queue = [];
  if (Array.isArray(input)) queue.push(...input);
  else if (input) queue.push(input);

  const output = [];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const nestedCandidates = [
      current.items,
      current.results,
      current.posts,
      current.entries,
      current.rows,
      current.data,
      current?.data?.items,
      current?.data?.results,
      current?.data?.rows,
      current?.payload?.items,
      current?.payload?.results,
    ];

    let pushedNested = false;
    for (const candidate of nestedCandidates) {
      if (Array.isArray(candidate) && candidate.length) {
        queue.push(...candidate);
        pushedNested = true;
      }
    }

    if (pushedNested) continue;

    output.push(current);
  }

  return output;
};

// Konverter enhver slags dato til ISO
const coerceDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 1e12) return new Date(value * 1000).toISOString();
    return new Date(value).toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    if (!Number.isNaN(num)) {
      return coerceDate(num);
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof value === "object") {
    if (value?.seconds && Number.isFinite(value.seconds)) {
      return coerceDate(value.seconds);
    }
    if (value?.ms && Number.isFinite(value.ms)) {
      return coerceDate(value.ms / 1000);
    }
  }
  return null;
};

// Byg et stabilt id
const stableId = (record) => {
  if (!record || typeof record !== "object") return null;

  const toStringOrNull = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" || typeof value === "string") {
      const str = String(value).trim();
      return str ? str : null;
    }
    return null;
  };

  const direct =
    toStringOrNull(record.post_id) ||
    toStringOrNull(record.id) ||
    toStringOrNull(record.facebookId) ||
    toStringOrNull(record.postId) ||
    toStringOrNull(record.postID);
  if (direct) return direct;

  const url =
    toStringOrNull(record.facebookUrl) ||
    toStringOrNull(record.url) ||
    toStringOrNull(record.permalinkUrl) ||
    toStringOrNull(record.postUrl) ||
    toStringOrNull(record.link);

  const text =
    record.summary ||
    record.text ||
    record.snippet ||
    record.message ||
    record.description ||
    "";
  const textSnippet = String(text).slice(0, 80).replace(/\s+/g, " ").trim();

  if (url) return `${url}|${textSnippet}`;
  return textSnippet || null;
};

// Normaliser et job-record
const normalizeJob = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const job = { ...raw };

  const textCandidate =
    job.text ||
    job.summary ||
    job.snippet ||
    job.message ||
    job.description ||
    "";
  if (!job.text && textCandidate) job.text = textCandidate;
  if (!job.summary && textCandidate) job.summary = textCandidate;

  const urlCandidate =
    job.facebookUrl ||
    job.url ||
    job.permalinkUrl ||
    job.postUrl ||
    job.link ||
    job.href ||
    null;
  if (urlCandidate) {
    job.url = urlCandidate;
    if (!job.facebookUrl) job.facebookUrl = urlCandidate;
  }

  const id = stableId(job);
  if (!id) return null;
  job.id = id;

  if (!job.title) {
    const titleCandidate =
      job.title ||
      job.name ||
      job.header ||
      (textCandidate ? String(textCandidate).split("\n")[0] : "") ||
      "";
    job.title = titleCandidate || "(no title)";
  }

  job.source = job.source || job.sourceName || job.origin || "FacebookGroups";
  job.country = job.country || job.region || "EU";

  const postedAt =
    coerceDate(job.postDate) ||
    coerceDate(job.posted_at) ||
    coerceDate(job.created_at) ||
    coerceDate(job.creation_time) ||
    coerceDate(job.debug_info?.creation_time) ||
    coerceDate(job.debug_info?.tracking?.post_context?.publish_time);
  if (postedAt) {
    job.postDate = postedAt;
    job.posted_at = postedAt;
  }

  const fetchedAt =
    coerceDate(job.fetched_at) ||
    coerceDate(job.importedAt) ||
    new Date().toISOString();
  job.fetched_at = fetchedAt;
  job.importedAt = fetchedAt;

  return job;
};

// Timestamp helper
const toTimestamp = (...values) => {
  for (const value of values) {
    const iso = coerceDate(value);
    if (iso) return new Date(iso).getTime();
  }
  return 0;
};

/* ---------- Crawl logik ---------- */

// Hent dataset fra run
async function fetchDataset(datasetId) {
  console.log("📥 Henter dataset…");
  return await fetchJson(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );
}

// Gem jobs.json
async function saveJobs(rawItems) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const flattened = flattenRecords(rawItems);
  const normalised = flattened.map(normalizeJob).filter(Boolean);

  const seen = new Set();
  const deduped = [];
  for (const job of normalised) {
    if (!job.id) continue;
    if (seen.has(job.id)) continue;
    seen.add(job.id);
    deduped.push(job);
  }

  deduped.sort(
    (a, b) =>
      toTimestamp(
        b.postDate,
        b.posted_at,
        b.created_at,
        b.creation_time,
        b.importedAt,
        b.fetched_at
      ) -
      toTimestamp(
        a.postDate,
        a.posted_at,
        a.created_at,
        a.creation_time,
        a.importedAt,
        a.fetched_at
      )
  );

  const out = {
    updatedAt: new Date().toISOString(),
    items: deduped,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));

  const droppedBeforeDedup = flattened.length - normalised.length;
  const duplicatesRemoved = normalised.length - deduped.length;
  if (droppedBeforeDedup > 0) {
    console.log(`ℹ️ Ignorerede ${droppedBeforeDedup} poster uden gyldigt indhold`);
  }
  if (duplicatesRemoved > 0) {
    console.log(`ℹ️ Fjernede ${duplicatesRemoved} dubletter baseret på id`);
  }

  console.log(`✅ Gemte ${out.items.length} opslag i ${OUT_FILE}`);
}

// Main
(async () => {
  try {
    console.log("→ Henter seneste run fra Apify…");
    const runsRes = await fetchJson(RUNS_URL);
    const latestRun = runsRes.data?.items?.[0];
    if (!latestRun) throw new Error("Ingen runs fundet i Apify!");

    const runId = latestRun.id || latestRun._id;
    if (!runId) throw new Error("Run mangler id i Apify-responsen");

    if (latestRun.status !== "SUCCEEDED") {
      console.log("⏳ Run er ikke SUCCEEDED endnu, venter…");
    }

    const datasetId =
      latestRun.defaultDatasetId ||
      latestRun.datasetId ||
      latestRun.output?.defaultDatasetId;
    if (!datasetId) throw new Error("Run mangler dataset-id i Apify-responsen");

    const items = await fetchDataset(datasetId);

    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
})();
