// scripts/crawl.mjs
// Selfcast – Casting Radar crawler (dependency-free).
// Henter opslag fra Facebook-grupper via dit Apify dataset
// og skriver resultat til: radar/jobs/live/jobs.json

////////////////////
// KONFIGURATION  //
////////////////////

// DIT Apify dataset-link med FB-gruppeopslag
const SOURCES = [
  {
    url: "https://api.apify.com/v2/datasets/l3YKdBneIPN0q9YsI/items?format=json&view=overview&clean=true",
    country: "EU",
    source: "Facebook Groups",
    parser: "apify-fb"
  }
];

// Output-fil (sti i repo)
const OUTPUT_PATH = "radar/jobs/live/jobs.json";

// Keywords til TAGGING (ikke et hårdt filter)
const KEYWORDS = [
  "casting","casting call","audition","open call",
  "extras","models","actors","self tape","selftape",
  "apply","submit","submissions","email","dm",
  "castingopslag","auditionering","statist","statister","medvirkende",
  "rolle","roller","optagelser","honorar","betaling","løn"
];

////////////////////
// HJÆLPERE
////////////////////
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function tagWithKeywords(text = "") {
  const low = text.toLowerCase();
  const found = KEYWORDS.filter(k => low.includes(k.toLowerCase()));
  return [...new Set(found)].join(",");
}

async function fetchJSON(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

////////////////////
// PARSER – Apify FB
////////////////////
async function scrapeApifyFb(source) {
  const data = await fetchJSON(source.url);
  const posts = Array.isArray(data) ? data : (data.items || data.data || []);
  const items = [];

  for (const p of posts) {
    const text = String(
      p.text || p.content || p.caption || p.message || p.title || ""
    ).trim();

    const link =
      p.permalinkUrl || p.permalink || p.url || p.link || p.postUrl || null;

    if (!text || !link) continue;

    // Titel = første linje/sætning
    const firstBreak = text.search(/[\.\!\?\n]/);
    const title = (firstBreak >= 0 ? text.slice(0, firstBreak) : text)
      .slice(0, 140)
      .trim();

    const rest = text.slice(title.length).trim();
    const summary = rest ? rest.slice(0, 300) : null;

    // Tidsstempel (brug Apify-felt hvis muligt)
    const rawDate =
      p.date || p.publishedTime || p.publishedAt || p.createdAt || p.timestamp || null;
    let fetchedAt = new Date().toISOString();
    try {
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) fetchedAt = d.toISOString();
      }
    } catch {}

    items.push({
      url: link,
      title: title || "(no title)",
      summary,
      country: source.country || null,
      source: source.source || "Facebook",
      tags: tagWithKeywords(text),
      fetched_at: fetchedAt
    });
  }
  return items;
}

////////////////////
// HOVEDKØRSEL
////////////////////
async function run() {
  const all = [];
  let success = 0, fail = 0;

  for (const s of SOURCES) {
    try {
      let batch = [];
      if (s.parser === "apify-fb") {
        batch = await scrapeApifyFb(s);
      } else {
        batch = []; // (flere parser-typer kan tilføjes her senere)
      }

      // simpel dedupe på (url + title)
      const seen = new Set();
      for (const it of batch) {
        const key = (it.url || "") + "::" + (it.title || "");
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(it);
      }
      success += batch.length;
      await delay(300);
    } catch (e) {
      console.error("crawl fail:", s.url, e.message);
      fail++;
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    counts: { success, fail, total: SOURCES.length },
    items: all.sort((a,b) => (b.fetched_at||"").localeCompare(a.fetched_at||""))
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("radar/jobs/live", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", OUTPUT_PATH, "=>", out.counts, "items:", out.items.length);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
