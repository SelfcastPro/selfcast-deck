import fs from "fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Helper til at hente JSON med native fetch
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Actor ID for Facebook Groups Scraper
const ACTOR_ID = "apify~facebook-groups-scraper";

// URL til seneste runs (kun denne Actor)
const RUNS_URL = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

// Gem til radar/jobs/live/jobs.json
const OUT_DIR = "radar/jobs/live";
const OUT_FILE = `${OUT_DIR}/jobs.json`;

// ---------- Hjælpere ----------

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
    if (!Number.isNaN(num)) return coerceDate(num);
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

const buildUser = (record) => {
  const candidate =
    record.user ||
    record.from ||
    record.owner ||
    record.author ||
    record.actor ||
    null;

  if (!candidate || typeof candidate !== "object") return null;

  const id =
    candidate.id ??
    candidate.uid ??
    candidate.userId ??
    candidate._id ??
    candidate.facebookId ??
    null;
  const name =
    candidate.name ??
    candidate.fullName ??
    candidate.full_name ??
    candidate.username ??
    candidate.displayName ??
    null;

  const out = {};
  if (id) out.id = id;
  if (name) out.name = name;
  return Object.keys(out).length ? out : null;
};

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

  const userId =
    toStringOrNull(record.user?.id) ||
    toStringOrNull(record.from?.id) ||
    toStringOrNull(record.owner?.id) ||
    toStringOrNull(record.author?.id);

  const text =
    record.summary ||
    record.text ||
    record.snippet ||
    record.message ||
    record.description ||
    "";
  const textSnippet = String(text).slice(0, 80).replace(/\s+/g, " ").trim();

  if (url && userId) return `${url}|${userId}|${textSnippet}`;
  if (url) return `${url}|${textSnippet}`;
  return textSnippet || null;
};

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

  const user = buildUser(job);
  if (user) job.user = user;

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
  const countryCandidate =
    job.country ||
    job.region ||
    job.location?.country ||
    job.location_country ||
    job.countryCode;
  job.country = countryCandidate || "EU";

  const postedAt =
    coerceDate(job.postDate) ||
    coerceDate(job.posted_at) ||
    coerceDate(job.postedAt) ||
    coerceDate(job.created_at) ||
    coerceDate(job.createdAt) ||
    coerceDate(job.creation_time) ||
    coerceDate(job.creationTime) ||
    coerceDate(job.creation_time_ms) ||
    coerceDate(job.debug_info?.creation_time) ||
    coerceDate(job.debug_info?.tracking?.post_context?.publish_time);
  if (postedAt) {
    job.postDate = postedAt;
    job.posted_at = postedAt;
  }

  const fetchedAt =
    coerceDate(job.fetched_at) ||
    coerceDate(job.fetchedAt) ||
    coerceDate(job.importedAt) ||
    coerceDate(job.updatedAt) ||
    new Date().toISOString();
  job.fetched_at = fetchedAt;
  job.importedAt = fetchedAt;

  return job;
};

const toTimestamp = (...values) => {
  for (const value of values) {
    const iso = coerceDate(value);
    if (iso) return new Date(iso).getTime();
  }
  return 0;
};

// ---------- Apify helpers ----------

// Start et nyt run (valgfrit, kan udkommenteres hvis vi kun henter seneste)
async function startRun() {
  console.log("🚀 Starter Apify run…");
  const res = await fetchJson(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxItems: 50,
      }),
    }
  );
  return res.data;
}

// Vent på run status
async function waitForRun(runId) {
  console.log(`⏳ Venter på run: ${runId}`);
  while (true) {
    const res = await fetchJson(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const { status } = res.data;
    console.log(`   Status: ${status}`);
    if (["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(status)) {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Hent dataset fra run
async function fetchDataset(datasetId) {
  console.log("📥 Henter dataset…");
 
  const allItems = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const pageUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=${limit}&offset=${offset}`;
    const pageItems = await fetchJson(pageUrl);
    if (!Array.isArray(pageItems)) {
      throw new Error(
        `Uventet respons fra Apify dataset: Forventede en liste, fik ${typeof pageItems}`
      );
    }

    allItems.push(...pageItems);

    console.log(
      `   Hentede ${pageItems.length} poster (offset ${offset}) – i alt ${allItems.length}`
    );

    if (pageItems.length < limit) break;
    offset += limit;
  }

  console.log(`📦 I alt ${allItems.length} poster hentet fra dataset ${datasetId}`);

  return allItems;
}

// Gem jobs.json
export async function saveJobs(rawItems, options = {}) {
  const outFile = options.outFile ?? OUT_FILE;
  const outDir =
    options.outDir ?? (options.outFile ? path.dirname(outFile) : OUT_DIR);

  fs.mkdirSync(outDir, { recursive: true });

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

  const droppedBeforeDedup = flattened.length - normalised.length;
  const duplicatesRemoved = normalised.length - deduped.length;
  if (droppedBeforeDedup > 0) {
    console.log(`ℹ️ Ignorerede ${droppedBeforeDedup} poster uden gyldigt indhold`);
  }
  if (duplicatesRemoved > 0) {
    console.log(`ℹ️ Fjernede ${duplicatesRemoved} dubletter baseret på id`);
  }

  if (deduped.length === 0) {
    if (fs.existsSync(outFile)) {
      console.warn(
        `⚠️ Ingen opslag hentet fra Apify – beholder eksisterende fil: ${outFile}`
      );
    } else {
      console.warn(
        `⚠️ Ingen opslag hentet fra Apify – ingen fil skrevet (${outFile})`
      );
    }
    return null;
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

  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));

  console.log(`✅ Gemte ${out.items.length} opslag i ${outFile}`);
  return out;
}

// ---------- Main ----------
const entryFileUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

async function run() {
  if (!APIFY_TOKEN) {
    console.error("❌ APIFY_TOKEN mangler. Tjek GitHub Secrets.");
    process.exit(1);
  }

  try {
    console.log("→ Henter seneste run fra Apify…");
    const runsRes = await fetchJson(RUNS_URL);
    const latestRun = runsRes.data?.items?.[0];
    if (!latestRun) throw new Error("Ingen runs fundet i Apify!");

    let runResult = latestRun;
    const runId = runResult.id || runResult._id;
    if (!runId) {
      throw new Error("Seneste run mangler et id i Apify-responsen");
    }

    if (runResult.status !== "SUCCEEDED") {
      runResult = await waitForRun(runId);
    }
    if (runResult.status !== "SUCCEEDED") {
      throw new Error(`Run fejlede: ${runResult.status}`);
    }

    const datasetId =
      runResult.defaultDatasetId ||
      runResult.datasetId ||
      runResult.output?.defaultDatasetId;
    if (!datasetId) {
      throw new Error("Run mangler dataset-id i Apify-responsen");
    }

    const items = await fetchDataset(datasetId);

    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
}

if (import.meta.url === entryFileUrl) {
  run();
}
