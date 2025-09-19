// scripts/crawl.mjs
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import crypto from "crypto";

const DATA_PATH = path.resolve("data/jobs.json"); // eksisterende
const DEFAULT_NEW = path.resolve("data/new_jobs.json"); // ny fil der downloades fra Apify eller genereres

function stableId(r){
  if(!r) return '';
  if(r.post_id) return String(r.post_id);
  if(r.id) return String(r.id);
  if(r.facebookId) return String(r.facebookId);
  if(r.facebookUrl && r.user && r.user.id){
    return `${r.facebookUrl}|${r.user.id}|${String((r.text||'').slice(0,80)).replace(/\s+/g,' ')}`;
  }
  // fallback hash of text+url
  const h = crypto.createHash('sha1');
  h.update(String(r.facebookUrl||'') + '|' + String((r.text||'').slice(0,200)));
  return h.digest('hex');
}

function extractPostDate(r){
  if(!r) return null;
  // prefer explicit fields
  const cand = r.postDate || r.posted_at || r.created_at || r.postedAt;
  if(cand){
    const n = Number(cand);
    if(!Number.isNaN(n)){
      if(n < 1e12) return new Date(n*1000).toISOString();
      return new Date(n).toISOString();
    }
    const p = Date.parse(cand);
    if(!Number.isNaN(p)) return new Date(p).toISOString();
  }
  if(r.creation_time){
    const n = Number(r.creation_time);
    if(!Number.isNaN(n)){
      if(n < 1e12) return new Date(n*1000).toISOString();
      return new Date(n).toISOString();
    }
  }
  // debug_info paths
  if(r.debug_info){
    const di = r.debug_info;
    if(di.creation_time){
      const n = Number(di.creation_time);
      if(!Number.isNaN(n)){
        if(n < 1e12) return new Date(n*1000).toISOString();
        return new Date(n).toISOString();
      }
    }
    const publish = di?.tracking?.post_context?.publish_time;
    if(publish){
      const n = Number(publish);
      if(!Number.isNaN(n)){
        if(n < 1e12) return new Date(n*1000).toISOString();
        return new Date(n).toISOString();
      }
    }
  }
  // fallback
  if(r.fetched_at) return new Date(r.fetched_at).toISOString();
  if(r.fetchedAt) return new Date(r.fetchedAt).toISOString();
  return null;
}

async function loadJSON(source){
  // source may be a URL or a local path
  try{
    if(/^(https?:)?\/\//.test(source)){
      const res = await fetch(source);
      if(!res.ok) throw new Error(`Fetch ${source} status ${res.status}`);
      return await res.json();
    } else {
      const raw = await fs.readFile(source, 'utf8');
      return JSON.parse(raw);
    }
  }catch(err){
    throw new Error(`Could not load JSON from ${source}: ${err.message}`);
  }
}

function normalizeItems(raw){
  // raw may be array or object with items
  const items = Array.isArray(raw) ? raw : (raw.items || raw.data || raw.rows || []);
  return items.map(it=>{
    const copy = {...it};
    // add computed postDate
    copy._postDate = extractPostDate(it); // ISO or null
    copy._stableId = stableId(it);
    return copy;
  });
}

async function saveJSON(filePath, data){
  await fs.mkdir(path.dirname(filePath), {recursive:true});
  await fs.writeFile(filePath, JSON.stringify(data,null,2),'utf8');
}

function mergeArrays(existing, incoming){
  const byId = new Map();
  for(const e of existing){
    const id = e._stableId || stableId(e);
    byId.set(id, {...e});
  }
  let added=0, updated=0, kept=0;

  for(const inc of incoming){
    const id = inc._stableId;
    const incDate = inc._postDate ? Date.parse(inc._postDate) : null;
    if(!byId.has(id)){
      // new item: store fetchedAt as now unless incoming has one
      const toStore = {...inc};
      toStore.fetched_at = toStore.fetched_at || new Date().toISOString();
      byId.set(id, toStore);
      added++;
      continue;
    }
    const old = byId.get(id);
    const oldDate = old._postDate ? Date.parse(old._postDate) : null;
    // If incoming has a better postDate and it's newer, update fields.
    if(incDate && (!oldDate || incDate > oldDate)){
      // keep certain old metadata (like read flags) — front-end manages reads separately
      const merged = {...old, ...inc};
      merged.fetched_at = merged.fetched_at || new Date().toISOString();
      // keep original created_at if present (so we do not overwrite run timestamp)
      if(old.created_at && !merged.created_at) merged.created_at = old.created_at;
      byId.set(id, merged);
      updated++;
    } else {
      // keep older (existing) item — but we might want to augment if incoming has fields missing in old
      // merge missing fields only
      let changed=false;
      for(const k of Object.keys(inc)){
        if((old[k] === undefined || old[k] === null) && inc[k] !== undefined){
          old[k] = inc[k];
          changed=true;
        }
      }
      if(changed) byId.set(id, old);
      kept++;
    }
  }

  // return array sorted by postDate newest first
  const out = Array.from(byId.values());
  out.sort((a,b)=>{
    const pa = a._postDate ? Date.parse(a._postDate) : 0;
    const pb = b._postDate ? Date.parse(b._postDate) : 0;
    return pb - pa;
  });

  return {merged: out, added, updated, kept};
}

async function main(){
  const argv = process.argv.slice(2);
  const opts = {};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--new' && argv[i+1]){ opts.new = argv[i+1]; i++; }
    if(argv[i]==='--out' && argv[i+1]){ opts.out = argv[i+1]; i++; }
  }
  const newSrc = opts.new || DEFAULT_NEW;
  const outFile = opts.out || DATA_PATH;

  console.log("Loading existing data:", outFile);
  let existing = [];
  try{
    const raw = await fs.readFile(outFile,'utf8');
    const json = JSON.parse(raw);
    existing = Array.isArray(json) ? json : (json.items || []);
    // ensure normalized fields exist
    existing = existing.map(it=>{
      it._stableId = it._stableId || stableId(it);
      it._postDate = it._postDate || extractPostDate(it);
      return it;
    });
  }catch(e){
    console.log("No existing data found or invalid JSON – starting fresh.");
    existing = [];
  }

  console.log("Loading incoming data from:", newSrc);
  const incomingRaw = await loadJSON(newSrc);
  const incoming = normalizeItems(incomingRaw);

  const result = mergeArrays(existing, incoming);
  const meta = {
    mergedAt: new Date().toISOString(),
    source: String(newSrc),
    counts: {existing: existing.length, incoming: incoming.length, added: result.added, updated: result.updated, kept: result.kept}
  };

  // write out: top-level array
  await saveJSON(outFile, result.merged);
  // write meta file
  await saveJSON(path.resolve(path.dirname(outFile),'jobs.meta.json'), meta);

  console.log("Merge done. Stats:", meta.counts);
  console.log("Saved merged data to:", outFile);
  console.log("Saved meta to:", path.resolve(path.dirname(outFile),'jobs.meta.json'));
}

main().catch(err=>{
  console.error("ERROR:", err);
  process.exit(1);
});
