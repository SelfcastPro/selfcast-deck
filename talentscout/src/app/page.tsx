"use client";
import { useState } from "react";

export default function Page() {
  const [hashtags, setHashtags] = useState("castingcall");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function runScraper() {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/apify/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtags: hashtags.split(",").map(h => h.trim()),
          resultsType: "posts",
          resultsLimit: 5
        }),
      });
      const json = await res.json();
      setResults(json.items || []);
    } catch (e) {
      alert("Error: " + e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>🎬 Selfcast – Instagram TalentScout</h1>
      <input
        value={hashtags}
        onChange={e => setHashtags(e.target.value)}
        placeholder="hashtags (comma-separated)"
      />
      <button onClick={runScraper}>Scrape</button>

      {loading && <p>Scraping…</p>}

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {results.map((r, i) => (
          <div key={i} style={{ border: "1px solid #ccc", padding: 10 }}>
            <div><strong>@{r.ownerUsername}</strong></div>
            <div>{r.caption}</div>
            <a href={r.url} target="_blank">View Post</a>
          </div>
        ))}
      </div>
    </div>
  );
}
