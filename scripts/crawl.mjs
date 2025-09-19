// scripts/crawl.mjs
// CASTING RADAR – Hent fra Apify, udled korrekt postDate, merge & gem

import fs from "node:fs/promises";

const SOURCES = [
  {
    // Brug dit dataset-items endpoint (overskueligt og stabilt)
    // Tip: læg evt. flere datasets her, vi samler dem.
    url: "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&clean=true",
    country: "EU",
    source: "FacebookGroups",
  },
];

const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30;          // behold maks 30 dage i output
const NOW_ISO = new Date().toISOString();

// Utils
const agoDays = (iso) => (!iso ? Infinity : (Date.now() - new Date(iso).getTime()) / 86400000);
const safe = (v, d="") => (v == null ? d : v);

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Udled stabil ID
function getId(row) {
  return (
    row.post_id ||
    row.id ||
    row.url ||
    (row.facebookUrl ? `${row.facebookUrl}|${row.user?.id ?? ""}` : null)
  );
}

// Udled ægte post-dato
function extractPostDate(row) {
  // 1) creation_time (secs -> ms)
  if (row.creation_time && Number.isFinite(+row.creation_time)) {
    return new Date(Number(row.creation_time) * 1000).toISOString();
  }
  // 2) debug_info.tracking.post_context.publish_time (secs)
  try {
    const tRaw = row.debug_info?.tracking || row.tracking; // nogle feeds har tracking i root
    if (tRaw) {
      const tracking = typeof tRaw === "string" ? JSON.parse(tRaw) : tRaw;
      const ts = tracking?.post_context?.publish_time;
      if (ts && Number.isFinite(+ts)) {
        return new Date(Number(ts) * 1000).toISOString();
      }
    }
  } catch (_) { /* ignore */ }

  // 3) Hvis intet, prøv timestamp/date/createdAt fra Apify-rækken
  if (row.timestamp) return new Date(row.timestamp).toISOString();
  if (row.date)      return new Date(row.date).toISOString();
  if (row.createdAt) return new Date(row.createdAt).toISOString();

  // 4) Fallback til nu (så vi aldrig taber posten)
  return NOW_ISO;
}

// Mapper en Apify-række til vores job-objekt
function mapRow(row, s) {
  const text = safe(row.text || row.postText || row.message?.text, "").trim();
  const url =
    row.postUrl ||
    row.url ||
    row.facebookUrl ||
    row.permalink ||
    row.attachments?.[0]?.url ||
    s.url;

  const postDate = extractPostDate(row);
  return {
    id: getId(row) || `${url}|${row.user?.id ?? ""}|${postDate}`, // sidste sikkerhedsnet
    url,
    title: text ? (text.length > 80 ? text.slice(0, 80) + "…" : text) : "(no title)",
    summary: text,
    country: s.country,
    source: s.source,
    postDate,                   // ÆGTE post-dato fra opslaget
    importedAt: NOW_ISO,        // hvornår VI først så posten (låses ved merge)
    raw: {
      facebookUrl: row.facebookUrl || null,
      user: row.user || null,
      likes: row.likesCount ?? null,
      comments: row.commentsCount ?? null,
    },
  };
}

// Læs eksisterende jobs.json (hvis findes)
async function loadExisting() {
  try {
    const buf = await fs.readFile(OUTPUT_PATH, "utf8");
    const json = JSON.parse(buf);
    return json.items || [];
  } catch {
    return [];
  }
}

// Merge, bevar importedAt + alt manuelt (checkmarks gemmes i localStorage i frontend)
function mergeJobs(oldItems, newItems) {
  const map = new Map();
  for (const it of oldItems) map.set(it.id, it);

  for (const it of newItems) {
    const prev = map.get(it.id);
    if (prev) {
      // Bevar importedAt, og brug nyeste summary/titel/url/postDate hvis de mangler før
      map.set(it.id, {
        ...prev,
        ...it,
        importedAt: prev.importedAt || it.importedAt,
        postDate: it.postDate || prev.postDate || prev.importedAt,
      });
    } else {
      map.set(it.id, it);
    }
  }

  // Trim til de sidste 30 dage baseret på postDate (fallback importedAt)
  const all = Array.from(map.values());
  return all
    .filter((x) => agoDays(x.postDate || x.importedAt) <= MAX_DAYS_KEEP)
    .sort((a, b) => new Date(b.postDate || b.importedAt) - new Date(a.postDate || a.importedAt));
}

async function run() {
  const existing = await loadExisting();
  const fresh = [];

  for (const s of SOURCES) {
    try {
      const rows = await fetchJson(s.url);
      for (const r of rows) {
        const id = getId(r);
        const text = r.text || r.postText || r.message?.text || "";
        if (!id || !text.trim()) continue; // ignorer støj/empty
        fresh.push(mapRow(r, s));
      }
    } catch (e) {
      console.error("Fetch fail:", s.url, e.message);
    }
  }

  const merged = mergeJobs(existing, fresh);

  const out = {
    updatedAt: NOW_ISO,
    meta: {
      keptDays: MAX_DAYS_KEEP,
      inputSources: SOURCES.map((s) => s.url),
      counts: { existing: existing.length, fresh: fresh.length, total: merged.length },
    },
    items: merged,
  };

  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", OUTPUT_PATH, "items:", merged.length);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
