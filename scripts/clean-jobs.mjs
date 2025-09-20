import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

const OUTPUT_PATH = "radar/jobs/live/jobs.json";
const MAX_DAYS_KEEP = 30;
const MS_PER_DAY = 86_400_000;

const agoDays = (iso) => {
  if (!iso) return Infinity;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return Infinity;
  return (Date.now() - time) / MS_PER_DAY;
};

const pickDate = (item) => new Date(item.postDate || item.importedAt || 0).getTime();

export const cleanJobs = async () => {
  const buf = await fs.readFile(OUTPUT_PATH, "utf8");
  const json = JSON.parse(buf);
  const map = new Map();

  for (const item of json.items || []) {
    if (!item || !item.id) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
