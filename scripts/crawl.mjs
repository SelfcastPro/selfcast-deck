// scripts/crawl.mjs
const SOURCES = [
  {
    url: "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&view=overview&clean=true",
    source: "FacebookGroups"
  }
];
const OUTPUT_PATH = "radar/jobs/live/jobs.json";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function guessCountry(url = "") {
  const s = url.toLowerCase();
  if (s.includes(".de") || s.includes("berlin") || s.includes("germany")) return "DE";
  if (s.includes("uk") || s.includes("london") || s.includes("scotland") || s.includes("wales")) return "UK";
  if (s.includes("es") || s.includes("spain") || s.includes("barcelona") || s.includes("madrid")) return "ES";
  if (s.includes("fr") || s.includes("france") || s.includes("paris")) return "FR";
  if (s.includes("se") || s.includes("sweden") || s.includes("stockholm")) return "SE";
  if (s.includes("dk") || s.includes("denmark") || s.includes("copenhagen")) return "DK";
  if (s.includes("no") || s.includes("norway") || s.includes("oslo")) return "NO";
  if (s.includes("fi") || s.includes("finland") || s.includes("helsinki")) return "FI";
  if (s.includes("lt") || s.includes("lithuania") || s.includes("vilnius")) return "LT";
  if (s.includes("lv") || s.includes("latvia") || s.includes("riga")) return "LV";
  if (s.includes("ee") || s.includes("estonia") || s.includes("tallinn")) return "EE";
  if (s.includes("ca") || s.includes("canada") || s.includes("ottawa") || s.includes("toronto")) return "CA";
  if (s.includes("us") || s.includes("usa") || s.includes("atlanta") || s.includes("newyork") || s.includes("losangeles")) return "US";
  return "EU";
}

async function run() {
  const items = [];
  let success = 0, skipped = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      const rows = await fetchJson(s.url);

      for (const r of rows) {
        const text = r.text || r.postText || "";
        if (!text) { skipped++; continue; }

        // Prioritér direkte post-link
        let link = r.postUrl || r.url || r.facebookUrl || s.url;

        const fetchedAt = new Date().toISOString();
        const postedAt = r.date || r.createdAt || fetchedAt;

        items.push({
          url: link,
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          summary: text,
          country: guessCountry(link),
          source: s.source,
          posted_at: postedAt,
          fetched_at: fetchedAt
        });
        success++;
      }
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, skipped, fail, total: SOURCES.length },
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
