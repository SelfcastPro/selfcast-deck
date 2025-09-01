// Node 20+, no dependencies
import { readFile, writeFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'radar', 'jobs', 'live');
const OUT_FILE = path.join(OUT_DIR, 'jobs.json');
const KEYWORDS_FILE = path.join(ROOT, 'radar', 'jobs', 'keywords.json');
const STATE_FILE = path.join(ROOT, 'radar', 'jobs', 'state.json');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID  = process.env.GOOGLE_CSE_ID;

// Tunables (kan også sættes som GitHub Secrets/Env)
const MAX_QUERIES_PER_RUN = parseInt(process.env.MAX_QUERIES_PER_RUN || '60', 10); // begræns antal søger
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '900', 10);              // pause mellem kald
const QUERY_COOLDOWN_HOURS = parseInt(process.env.QUERY_COOLDOWN_HOURS || '24', 10); // skip hvis søgt < X timer siden
const MAX_RESULTS = parseInt(process.env.MAX_RESULTS || '10000', 10);              // cap jobs.json

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
  console.error('Missing GOOGLE_API_KEY or GOOGLE_CSE_ID in env vars');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function loadJSON(fp, fallback) {
  try { return JSON.parse(await readFile(fp, 'utf-8')); }
  catch { return fallback; }
}
async function saveJSON(fp, obj) {
  await writeFile(fp, JSON.stringify(obj, null, 2), 'utf-8');
}

function sha1(x) { return createHash('sha1').update(x).digest('hex'); }
function domain(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; } }
function nowIso(){ return new Date().toISOString(); }
const sleep = (ms)=> new Promise(r=> setTimeout(r, ms));

function extractEmail(s){
  const m = (s||'').match(/[\w.\-+]+@[\w.\-]+\.\w+/);
  return m ? m[0] : '';
}
function extractPhone(s){
  const m = (s||'').match(/(\+\d{1,3}\s?)?(?:\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4,5}/);
  return m ? m[0] : '';
}

// ----------------------
// Noise filter
// ----------------------
const BLACKLIST = [
  "metal","steel","iron","aluminium","aluminum","bronze","resin","foundry",
  "mold","mould","die","forge","forging","investment casting",
  "orthopedic","orthopaedic","plaster","fracture","dental","dentist",
  "casting vote","ballot","election"
];

function isValid(r) {
  const txt = ((r.title||"") + " " + (r.snippet||"")).toLowerCase();
  const dom = (r.source_domain || "").toLowerCase();

  if (dom.includes("youtube.com") || dom.includes("youtu.be")) return false;

  const hit = BLACKLIST.some(term => txt.includes(term));
  if (!hit) return true;

  // whitelist: hold software-relaterede (til konkurrent-indsigt)
  return txt.includes("software");
}

// ----------------------
// Google CSE client med retry/backoff
// ----------------------
async function cse(query, lang, attempt=1) {
  const base = 'https://www.googleapis.com/customsearch/v1';
  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: GOOGLE_CSE_ID,
    q: query,
    num: '10'
  });
  if (lang) params.set('lr', `lang_${lang}`);
  const url = `${base}?${params.toString()}`;
  const res = await fetch(url);

  if (res.status === 429 || res.status >= 500) {
    // exponential backoff
    if (attempt <= 3) {
      const wait = Math.min(15000, MIN_DELAY_MS * Math.pow(2, attempt)); // op til 15s
      console.warn(`Rate/Server limit (HTTP ${res.status}). Retry #${attempt} after ${wait}ms for "${query}"`);
      await sleep(wait);
      return cse(query, lang, attempt+1);
    } else {
      throw new Error(`CSE HTTP ${res.status}`);
    }
  }
  if (!res.ok) throw new Error('CSE HTTP ' + res.status);
  return await res.json();
}

// ----------------------
// Main run
// ----------------------
async function run() {
  const prev = await loadJSON(OUT_FILE, []);
  const prevById = new Map(prev.map(x => [x.id, x]));
  const kws = await loadJSON(KEYWORDS_FILE, []);
  const state = await loadJSON(STATE_FILE, { cursor: 0, lastQueriedAt: {} });

  // flad liste af (country, lang, query)
  const allQueries = [];
  for (const row of kws) {
    for (const q of row.queries) {
      allQueries.push({ country: row.country || '', lang: row.lang || '', q });
    }
  }

  // skip queries kørt for nylig (cooldown)
  const cutoff = Date.now() - QUERY_COOLDOWN_HOURS * 3600 * 1000;
  const due = allQueries.filter(({q, country}) => {
    const key = `${country}::${q}`;
    const t = state.lastQueriedAt[key] || 0;
    return t < cutoff;
  });

  // round-robin via cursor + cap pr. run
  let start = state.cursor % (due.length || 1);
  const batch = [];
  for (let i = 0; i < Math.min(MAX_QUERIES_PER_RUN, due.length); i++) {
    batch.push(due[(start + i) % due.length]);
  }

  console.log(`Total queries: ${allQueries.length}, due now: ${due.length}, taking: ${batch.length} this run.`);

  const results = [];
  for (let i = 0; i < batch.length; i++) {
    const { country, lang, q } = batch[i];
    try {
      const data = await cse(q, lang);
      for (const item of (data.items || [])) {
        const link = item.link;
        const title = item.title || '';
        const snippet = item.snippet || '';
        const id = sha1((title||'') + '|' + (link||''));
        const source_domain = domain(link);
        const contact_email = extractEmail(snippet);
        const contact_phone = extractPhone(snippet);
        results.push({
          id, title, link, snippet, source_domain,
          country, lang, query: q,
          fetched_at: nowIso(),
          first_seen: prevById.get(id)?.first_seen || nowIso(),
          contact_email, contact_phone
        });
      }
      // markér som kørt
      state.lastQueriedAt[`${country}::${q}`] = Date.now();
    } catch (e) {
      console.error('Query failed:', q, e.message);
      // ved hård 429 efter retries: marker alligevel tidspunkt, så vi ikke banker på igen næste minut
      state.lastQueriedAt[`${country}::${q}`] = Date.now();
    }

    // lille pause mellem kald for at undgå 429
    await sleep(MIN_DELAY_MS);
  }

  // bump cursor til næste runde
  state.cursor = (start + batch.length) % Math.max(due.length, 1);

  // Dedup + støjfilter + sort
  const byId = new Map();
  for (const r of [...results, ...prev]) {
    if (!isValid(r)) continue;
    const had = byId.get(r.id);
    if (!had) byId.set(r.id, r);
    else if (new Date(r.first_seen) < new Date(had.first_seen)) had.first_seen = r.first_seen;
  }

  const out = Array.from(byId.values())
    .sort((a,b)=> (b.first_seen||'').localeCompare(a.first_seen||''))
    .slice(0, MAX_RESULTS);

  await saveJSON(OUT_FILE, out);
  await saveJSON(STATE_FILE, state);
  console.log(`Wrote ${OUT_FILE} ${out.length} items. State: cursor=${state.cursor}, tracked=${Object.keys(state.lastQueriedAt).length}`);
}

run().catch(err => { console.error(err); process.exit(1); });
