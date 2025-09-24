"use client";
import { useEffect, useMemo, useState } from "react";

type Item = {
  username?: string;
  ownerUsername?: string;
  fullName?: string;
  ownerFullName?: string;
  bio?: string;
  ownerBiography?: string;
  caption?: string;
  profileUrl?: string;
  ownerUrl?: string;
  profilePicUrl?: string;
  ownerProfilePicUrl?: string;
  followers?: number;
  ownerFollowers?: number;
  url?: string; // post URL
  hashtag?: string;
  hashtagName?: string;
};

function pick<T>(...vals: (T | undefined)[]) { return vals.find(v => v !== undefined) }

export default function Page() {
  const [datasetId, setDatasetId] = useState<string>("");
  const [useLatest, setUseLatest] = useState<boolean>(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const url = useLatest ? "/api/apify/latest" : `/api/apify/items${datasetId ? `?datasetId=${encodeURIComponent(datasetId)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setItems(json.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { /* no auto load */ }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(it => {
      const hay = [
        it.username, it.ownerUsername, it.fullName, it.ownerFullName,
        it.bio, it.ownerBiography, it.caption, it.hashtag, it.hashtagName
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [items, q]);

  return (
    <>
      <div className="row" style={{marginBottom:12}}>
        <input className="input" placeholder="Optional: Dataset ID (fx nd9sF3LowRSr1Buoa)"
               value={datasetId} onChange={e=>setDatasetId(e.target.value)} />
        <label className="row">
          <input type="checkbox" checked={useLatest} onChange={e=>setUseLatest(e.target.checked)} />
          Brug seneste run (APIFY_ACTOR_ID)
        </label>
        <button className="btn" onClick={load}>Fetch</button>
      </div>

      <div className="row" style={{marginBottom:12}}>
        <input className="input" placeholder="Søg (navn, bio, caption, hashtag…)" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="badge">Total: {items.length}</div>
        <div className="badge">Vises: {filtered.length}</div>
      </div>

      {error && <div className="card" style={{borderColor:'#e00', color:'#e00'}}>{error}</div>}
      {loading && <div className="card">Henter data fra Apify…</div>}

      <div className="grid">
        {filtered.map((it, idx) => {
          const username = pick(it.username, it.ownerUsername) || "unknown";
          const fullName = pick(it.fullName, it.ownerFullName);
          const avatar = pick(it.profilePicUrl, it.ownerProfilePicUrl);
          const followers = pick(it.followers, it.ownerFollowers);
          const bio = pick(it.bio, it.ownerBiography);
          const profileUrl = pick(it.profileUrl, it.ownerUrl) || (username ? `https://instagram.com/${username}` : undefined);
          const postUrl = it.url;

          return (
            <div key={idx} className="card">
              <div className="row">
                <img src={avatar || "https://dummyimage.com/64x64/ddd/fff.jpg&text=IG"} alt="" width={48} height={48} style={{borderRadius:999}}/>
                <div>
                  <div><a href={profileUrl} target="_blank">@{username}</a></div>
                  {fullName && <div style={{fontSize:12,opacity:.7}}>{fullName}</div>}
                </div>
              </div>
              {followers !== undefined && <div className="badge">{followers} followers</div>}
              {it.hashtagName && <div className="badge">#{it.hashtagName}</div>}
              {postUrl && <div style={{marginTop:6}}><a href={postUrl} target="_blank">Åbn opslag</a></div>}
              {bio && <div style={{marginTop:8, fontSize:14, opacity:.85}}>{bio}</div>}
              {it.caption && <div style={{marginTop:8, fontSize:13, opacity:.7}}>{it.caption}</div>}
              <div style={{marginTop:8}}>
                <button className="btn" onClick={()=>{
                  const msg =
`Hi @${username},
We’re inviting selected talents like you to join Selfcast – clients and producers can book talents directly with 0% commission.
Download Selfcast on App Store / Google Play and email support@selfcast.com for 3 months FREE.
@selfcastapp | @yourprofile`;
                  navigator.clipboard.writeText(msg);
                  alert("DM template kopieret ✔");
                }}>Copy DM</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
