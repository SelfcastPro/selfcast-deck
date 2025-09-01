// Node 20+, no dependencies
import { readFile, writeFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'radar', 'jobs', 'live');
const OUT_FILE = path.join(OUT_DIR, 'jobs.json');
const KEYWORDS_FILE = path.join(ROOT, 'radar', 'jobs', 'keywords.json');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID  = process.env.GOOGLE_CSE_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
  console.error('Missing GOOGLE_API_KEY or GOOGLE_CSE_ID in env vars');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function loadJSON(fp, fallback) {
  try { return JSON.parse(await readFile(fp, 'utf-8')); }
  catch { return fallback; }
}

function sha1(x) { return createHash('sha1').update(x).digest('hex'); }
function domain(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; } }
function nowIso(){ return new Date().toISOString(); }

function extractEmail(s){
  const m = (s||'').match(/[\w.\-+]+@[\w.\-]+\.\w+/);
  return m ? m[0] : '';
}
function extractPhone(s){
  const m = (s||'').match(/(\+\d{1,3}\s?)?(?:\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4,5}/);
  return m ? m[0] : '';
}

async function cse(query, lang) {
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
  if (!res.ok) throw new Error('CSE HTTP ' + res.status);
  return await res.json();
}

async function run() {
  const prev = await loadJSON(OUT_FILE, []);
  const prevById = new Map(prev.map(x => [x.id, x]));
  const kws = await loadJSON(KEYWORDS_FILE, []);

  const results = [];

  for (const row of kws) {
    for (const q of row.queries) {
      try {
        const data = await cse(q, row.lang);
        for (const item of (data.items || [])) {
          const link = item.link;
          const title = item.title || '';
          const snippet = item.snippet || '';
          const id = sha1((title||'') + '|' + (link||''));
          const source_domain = domain(link);
          const contact_email = extractEmail(snippet);
          const contact_phone = extractPhone(snippet);

          const obj = {
            id, title, link, snippet,
            source_domain,
            country: row.country || '',
            lang: row.lang || '',
            query: q,
            fetched_at: nowIso(),
            first_seen: prevById.get(id)?.first_seen || nowIso(),
            contact_email, contact_phone
          };
          results.push(obj);
        }
      } catch (e) {
        console.error('Query failed:', q, e.message);
      }
    }
  }

  // Dedupér på id – behold tidligste first_seen
  const byId = new Map();
  for (const r of [...results, ...prev]) {
    const had = byId.get(r.id);
    if (!had) byId.set(r.id, r);
    else if (new Date(r.first_seen) < new Date(had.first_seen)) had.first_seen = r.first_seen;
  }

  const out = Array.from(byId.values())
    .sort((a,b)=> (b.first_seen||'').localeCompare(a.first_seen||''))
    .slice(0, 10000);

  await writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf-8');
  console.log('Wrote', OUT_FILE, out.length, 'items');
}

run().catch(err => { console.error(err); process.exit(1); });
