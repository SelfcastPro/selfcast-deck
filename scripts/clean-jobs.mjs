import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const OUTPUT_PATH = "radar/jobs/live/jobs.json";
export const MAX_DAYS_KEEP = 30;
export const MS_PER_DAY = 86_400_000;

const POST_DATE_FIELDS = [
  "postDate",
  "post_date",
  "postedAt",
  "posted_at",
  "publishedAt",
  "published_at",
  "createdAt",
  "created_at",
  "time",
  "timestamp",
];

const IMPORT_DATE_FIELDS = [
  "importedAt",
  "imported_at",
  "fetched_at",
  "time",
  "timestamp",
];

export const toEpochMs = (value) => {
  if (value == null) return undefined;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    if (value >= 1e11) return Math.trunc(value);
    if (value >= 1e9) return Math.trunc(value * 1000);
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return toEpochMs(Number(trimmed));
    }
    const time = new Date(trimmed).getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
};

export const toIsoDate = (value) => {
  const time = toEpochMs(value);
  return typeof time === "number" ? new Date(time).toISOString() : undefined;
};

const pickIsoDate = (item, fields) => {
  if (!item) return undefined;
  for (const field of fields) {
    const iso = toIsoDate(item[field]);
    if (iso) return iso;
  }
  return undefined;
};

export const normaliseItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const id = item.id;
  if (!id) return null;
  const normalised = { ...item, id: typeof id === "string" ? id : String(id) };

  const importedAt = pickIsoDate(item, IMPORT_DATE_FIELDS);
  if (importedAt) {
    normalised.importedAt = importedAt;
  }

  const postDate = pickIsoDate(item, POST_DATE_FIELDS) || importedAt;
  if (postDate) {
    normalised.postDate = postDate;
  }

  return normalised;
};

export const agoDays = (value) => {
  const time = toEpochMs(value);
  if (typeof time !== "number") return Infinity;
  return (Date.now() - time) / MS_PER_DAY;
};

export const pickDate = (item) => toEpochMs(item?.postDate ?? item?.importedAt) ?? 0;

export const cleanJobs = async () => {
  const buf = await fs.readFile(OUTPUT_PATH, "utf8");
  const json = JSON.parse(buf);
  const map = new Map();

  for (const rawItem of json.items || []) {
    const item = normaliseItem(rawItem);
    if (!item) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  const items = Array.from(map.values())
    .filter((item) => agoDays(item.postDate || item.importedAt) <= MAX_DAYS_KEEP)
    .sort((a, b) => pickDate(b) - pickDate(a));

  const out = { ...json, updatedAt: new Date().toISOString(), items };
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  return items.length;
};

const entryFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (import.meta.url === entryFileUrl) {
  cleanJobs()
    .then((count) => {
      console.log("Cleaned. Items:", count);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
