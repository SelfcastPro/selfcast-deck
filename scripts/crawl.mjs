import fs from "fs";

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN mangler. Tjek GitHub Secrets.");
  process.exit(1);
}

const ACTOR_ID = "apify~facebook-groups-scraper";
const RUNS_URL = `https://api.apify.com/v2/actor-runs?token=${APIFY_TOKEN}&limit=1&desc=true`;

const OUT_DIR = "radar/jobs/live";
const OUT_FILE = `${OUT_DIR}/jobs.json`;

/* ---------- helpers ---------- */
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
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 1e12) return new Date(value * 1000).toISOString();
    return new Date(value).toISOString();
  }
  if (typeof value === "string") {
    const num = Number(value);
    if (!Number.isNaN(num)) return coerceDate(num);
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof value === "object") {
    if (value?.seconds) return coerceDate(value.seconds);
    if (value?.ms) return coerceDate(value.ms / 1000);
  }
  return null;
};

const stableId = (record) => {
  if (!record) return null;
  if (record.post_id) return record.post_id;
  if (record.id) return record.id;
  if (record.facebookId) return record.facebookId;
  const url = record.facebookUrl || record.url;
  const text = record.text || "";
  return `${url||''}|${text.slice(0,80)}`;
};

const normalizeJob = (raw) => {
  if (!raw) return null;
  const job = { ...raw };
  const textCandidate = job.text || job.summary || job.snippet || "";
  if (!job.text) job.text = textCandidate;
  if (!job.summary) job.summary = textCandidate;
  const urlCandidate = job.facebookUrl || job.url || job.postUrl;
  if (urlCandidate) job.url = urlCandidate;
  const id = stableId(job);
  if (!id) return null;
  job.id = id;
  if (!job.title) job.title = textCandidate.split("\n")[0] || "(no title)";
  const postedAt =
    coerceDate(job.postDate) ||
    coerceDate(job.posted_at) ||
    coerceDate(job.creation_time);
  if (postedAt) job.posted_at = postedAt;
  job.fetched_at = new Date().toISOString();
  return job;
};

/* ---------- main ---------- */
async function fetchDataset(datasetId) {
  return await fetchJson(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  );
}

async function saveJobs(rawItems) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const flattened = flattenRecords(rawItems);
  const normalised = flattened.map(normalizeJob).filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (const job of normalised) {
    if (!job.id || seen.has(job.id)) continue;
    seen.add(job.id);
    deduped.push(job);
  }
  deduped.sort((a, b) =>
    new Date(b.posted_at||b.fetched_at) - new Date(a.posted_at||a.fetched_at)
  );
  const out = { updatedAt: new Date().toISOString(), items: deduped };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`✅ Gemte ${out.items.length} opslag i ${OUT_FILE}`);
}

(async () => {
  try {
    console.log("→ Henter seneste run fra Apify…");
    const runsRes = await fetchJson(RUNS_URL);
    const latestRun = runsRes.data?.items?.[0];
    if (!latestRun) throw new Error("Ingen runs fundet i Apify!");
    const datasetId =
      latestRun.defaultDatasetId ||
      latestRun.datasetId ||
      latestRun.output?.defaultDatasetId;
    if (!datasetId) throw new Error("Run mangler dataset-id i Apify!");
    const items = await fetchDataset(datasetId);
    await saveJobs(items);
  } catch (err) {
    console.error("❌ Fejl under crawl:", err.message);
    process.exit(1);
  }
})();
