// scripts/crawl.mjs
// Henter opslag fra Apify dataset (Facebook grupper) og skriver til radar/jobs/live/jobs.json

// >>> SKIFT KUN URL'EN HER, hvis din dataset-ID ændrer sig <<<
const APIFY_DATASET_URL =
  "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&clean=true";

// Output i repo
const OUTPUT_PATH = "radar/jobs/live/jobs.json";

// Hjælpere
const toISO = (v) => {
  if (!v) return null;
  // tal -> epoch
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString();
  }
  if (/^\d+$/.test(String(v))) {
    const d = new Date(Number(v));
    return isNaN(d) ? null : d.toISOString();
  }
  const d = new Date(String(v));
  return isNaN(d) ? null : d.toISOString();
};

const pickLink = (r) => {
  // Apify felter der kan eksistere
  let link =
    r.permalink ||
    r.postUrl ||
    r.url ||
    r.shareUrl ||
    r.facebookUrl ||
    null;

  // permalink kan være uden https
  if (link && typeof link === "string" && !link.startsWith("http")) {
    link = "https://www.facebook.com" + link;
  }
  return link;
};

async function fetchJson(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function run() {
  const items = [];
  let success = 0, skipped = 0, fail = 0;

  try {
    const rows = await fetchJson(APIFY_DATASET_URL);

    for (const r of rows) {
      try {
        const text = r.text || r.postText || "";
        if (!text) { skipped++; continue; }

        const link = pickLink(r);
        if (!link) { skipped++; continue; }

        const posted =
          toISO(r.timestamp) ||
          toISO(r.date) ||
          toISO(r.createdAt) ||
          toISO(r.lastActivityTime);

        // vi gemmer altid—dato kan være null; UI håndterer filtrering
        items.push({
          url: link,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: "EU",
          source: "FacebookGroups",
          posted_at: posted,                     // korrekt hvis tilgængelig
          fetched_at: new Date().toISOString()
        });
        success++;
      } catch {
        skipped++;
      }
    }
  } catch (e) {
    console.error("crawl fail:", APIFY_DATASET_URL, e.message);
    fail++;
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, fail, total: items.length },
    items
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", OUTPUT_PATH, "=>", out.counts);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
