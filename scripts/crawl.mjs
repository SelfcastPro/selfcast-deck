// scripts/crawl.mjs
// Henter seneste SUCCEEDED-run fra Apify Facebook Groups Scraper
// og skriver til radar/jobs/live/jobs.json (merge + dedup)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

// ====== KONFIG ======
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "apify~facebook-groups-scraper"; // Apify’s officielle actor
const OUT_PATH = "radar/jobs/live/jobs.json";
const MAX_KEEP = 10000; // max antal items i filen

if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN mangler. Tilføj den under Actions → Secrets.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (x) => createHash("sha1").update(String(x)).digest("hex");

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function toIsoFromMaybeUnix(v) {
  if (v == null) return null;
  // v kan være unix sekunder, unix ms, ISO string, number string
  const n = Number(v);
  if (!Number.isNaN(n) && Number.isFinite(n)) {
    // heuristik: sekunder vs millisekunder
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // prøv som ISO
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function pickPostUrl(item) {
  // Prioritér direkte post-link, ellers første attachment, ellers group url
  if (item.postUrl) return item.postUrl;
  if (item.url) return item.url;
  if (item.facebookUrl) return item.facebookUrl;

  const a = Array.isArray(item.attachments) ? item.attachments : [];
  for (const at of a) {
    if (at?.url) return at.url;
    if (at?.photo_image?.uri) return at.photo_image.uri;
  }
  return item.facebookUrl || "";
}

function derivePostDate(item) {
  // prøv en masse mulige felter
  return (
    toIsoFromMaybeUnix(item.creation_time) ||
    toIsoFromMaybeUnix(item.creationTime) ||
    toIsoFromMaybeUnix(item.date) ||
    toIsoFromMaybeUnix(item.createdAt) ||
    toIsoFromMaybeUnix(item.lastActivityTime) ||
    null
  );
}

function deriveId(item) {
  // brug post-id hvis muligt, ellers hash af (url + text)
  const a = Array.isArray(item.attachments) ? item.attachments : [];
  const attachmentId =
    item.postId ||
    item.id ||
    a.find((x) => x?.id)?.id ||
    null;

  if (attachmentId) return String(attachmentId);

  const url = pickPostUrl(item) || "";
  const txt = (item.text || item.postText || "").slice(0, 200);
  return sha1(`${url}||${txt}`);
}

async function loadPrev() {
  try {
    const s = await readFile(OUT_PATH, "utf8");
    const obj = JSON.parse(s);
    return Array.isArray(obj) ? obj : obj.items || [];
  } catch {
    return [];
  }
}

async function ensureDir(fp) {
  await mkdir(dirname(fp), { recursive: true });
}

async function getLatestSucceededRun() {
  // hent de seneste 10 og tag første SUCCEEDED
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(
    ACTOR_ID
  )}/runs?token=${APIFY_TOKEN}&limit=10&desc=1`;
  const json = await fetchJson(url);
  const runs = json?.data?.items || [];
  const ok = runs.find((r) => r.status === "SUCCEEDED");
  if (!ok) throw new Error("No SUCCEEDED runs found for actor.");
  return ok; // { id, defaultDatasetId, ... }
}

async function fetchDatasetItems(datasetId) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&clean=true`;
  return fetchJson(url);
}

function mapItem(raw) {
  const url = pickPostUrl(raw);
  const posted = derivePostDate(raw);
  const titleBase = (raw.postTitle || raw.title || raw.text || raw.postText || "").trim();
  const title =
    titleBase
      ? (titleBase.length > 80 ? titleBase.slice(0, 80) + "…" : titleBase)
      : "(no title)";
  const summary = (raw.text || raw.postText || "").trim();

  return {
    id: deriveId(raw),
    url,
    title,
    summary,
    country: "EU",
    source: "FacebookGroups",
    postDate: posted,
    importedAt: new Date().toISOString(),
  };
}

function mergeDedup(prev, next) {
  const byId = new Map();
  for (const it of [...prev, ...next]) {
    const id = it.id || sha1((it.url || "") + "|" + (it.title || ""));
    const existing = byId.get(id);
    if (!existing) byId.set(id, it);
    else {
      // bevar tidligste importedAt og postDate hvis en mangler
      if (existing.importedAt && it.importedAt) {
        if (new Date(it.importedAt) < new Date(existing.importedAt)) {
          existing.importedAt = it.importedAt;
        }
      }
      if (!existing.postDate && it.postDate) existing.postDate = it.postDate;
    }
  }
  // sortér nyeste postDate først (fallback importedAt)
  const arr = Array.from(byId.values()).sort((a, b) => {
    const da = new Date(a.postDate || a.importedAt || 0).getTime();
    const db = new Date(b.postDate || b.importedAt || 0).getTime();
    return db - da;
  });
  return arr.slice(0, MAX_KEEP);
}

async function main() {
  try {
    console.log("🔎 Henter seneste SUCCEEDED run…");
    const run = await getLatestSucceededRun();

    if (!run.defaultDatasetId) {
      throw new Error("Run har ikke defaultDatasetId.");
    }
    console.log("📦 Dataset:", run.defaultDatasetId);

    const rawItems = await fetchDatasetItems(run.defaultDatasetId);
    console.log("📥 Modtog items:", Array.isArray(rawItems) ? rawItems.length : 0);

    const mapped = (Array.isArray(rawItems) ? rawItems : []).map(mapItem);

    const prev = await loadPrev();
    const merged = mergeDedup(prev, mapped);

    await ensureDir(OUT_PATH);
    const out = {
      updatedAt: new Date().toISOString(),
      items: merged,
    };
    await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
    console.log(`✅ Skrev ${merged.length} items til ${OUT_PATH}`);
  } catch (err) {
    console.error("❌ Crawl-fejl:", err.message);

    // Fallback: skriv tom struktur så frontend ikke går i stykker
    await ensureDir(OUT_PATH);
    const out = { updatedAt: new Date().toISOString(), items: [] };
    await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
    console.log(`↩️  Fallback skrevet til ${OUT_PATH}`);
    process.exit(1);
  }
}

main();
