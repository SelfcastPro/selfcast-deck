"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type UnknownRecord = Record<string, unknown>;

interface Profile {
  id?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  followers?: number;
  caption?: string;
  postUrl?: string;
  profileUrl?: string;
  dmCopy?: string;
  location?: string;
  hashtags?: string[];
  displayUrl?: string;
  timestamp?: string;
  likes?: number;
  bufferedAt?: string;
  raw: UnknownRecord;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function toRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function firstDefined<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const v of values) if (v !== undefined && v !== null) return v;
  return undefined;
}

function normalizeHashtags(value: unknown): string[] | undefined {
  const tags: string[] = [];
  const seen = new Set<string>();

  const add = (t: string) => {
    const c = t.replace(/^#+/, "").trim();
    if (!c) return;
    const k = c.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    tags.push(c);
  };

  const handle = (input: unknown) => {
    if (!input) return;
    if (Array.isArray(input)) return input.forEach(handle);
    if (typeof input === "string") return input.split(/[\s,]+/).forEach(add);
    if (typeof input === "object") {
      const rec = input as UnknownRecord;
      const cand = firstString(rec.name, rec.tag, rec.value);
      if (cand) handle(cand);
    }
  };

  handle(value);
  return tags.length ? tags : undefined;
}

function parseNumeric(value: unknown): number | undefined {
  if (value == null) return;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
}

function normalizeProfile(raw: UnknownRecord): Profile {
  const owner = toRecord(raw.owner);
  const post = toRecord(raw.post);

  return {
    id: (raw.id as string) ?? raw.permalink?.toString(),
    username: firstString(raw.username, owner?.username),
    fullName: firstString(raw.fullName, owner?.fullName),
    avatarUrl: firstString(raw.avatarUrl, owner?.avatarUrl),
    followers: parseNumeric(firstDefined(raw.followers, owner?.followers)),
    caption: firstString(raw.caption, post?.caption),
    postUrl: firstString(raw.url, raw.postUrl, post?.url),
    profileUrl:
      firstString(raw.profileUrl, owner?.profileUrl) ??
      (raw.username ? `https://instagram.com/${raw.username}` : undefined),
    hashtags: normalizeHashtags(firstDefined(raw.hashtags, post?.hashtags)),
    displayUrl: firstString(raw.displayUrl, post?.displayUrl),
    timestamp: firstString(raw.timestamp, post?.timestamp),
    likes: parseNumeric(firstDefined(raw.likes, post?.likes)),
    bufferedAt: firstString(raw.bufferedAt, raw.ingestedAt),
    raw,
  };
}

function formatFollowers(n?: number) {
  return n === undefined ? undefined : n >= 1_000 ? numberFormatter.format(n) : n.toString();
}
function formatDate(v?: string) {
  if (!v) return;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toLocaleString();
}

function buildDm(profile: Profile) {
  return profile.dmCopy?.trim()
    ? profile.dmCopy
    : profile.username
    ? `Hi @${profile.username}, we’re casting for new projects! Please apply via Selfcast: https://selfcast.com`
    : "Hi! We’re casting for new projects! Please apply via Selfcast: https://selfcast.com";
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "likes" | "hashtags">("date");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/profiles")
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data.items) ? data.items : [];
        setProfiles(items.map((i: unknown) => normalizeProfile(i as UnknownRecord)));
      })
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const list = [...profiles];
    list.sort((a, b) => {
      if (sortBy === "likes") return (b.likes ?? 0) - (a.likes ?? 0);
      if (sortBy === "hashtags") return (b.hashtags?.length ?? 0) - (a.hashtags?.length ?? 0);
      return new Date(b.timestamp ?? b.bufferedAt ?? 0).getTime() -
             new Date(a.timestamp ?? a.bufferedAt ?? 0).getTime();
    });
    return list;
  }, [profiles, sortBy]);

  const handleCopy = (p: Profile) => {
    const text = buildDm(p);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p.id ?? p.username ?? "");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1>🎬 Selfcast – Instagram TalentScout</h1>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
          }}
          style={{ display: "flex", gap: 12, marginTop: 12 }}
        >
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter profiles (e.g. berlin, followers>10k)"
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: 6 }}
          >
            <option value="date">Newest</option>
            <option value="likes">Most likes</option>
            <option value="hashtags">Most hashtags</option>
          </select>
        </form>
      </header>

      {loading ? (
        <p>Loading profiles…</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {sorted
            .filter(p =>
              query
                ? p.username?.includes(query) ||
                  p.fullName?.includes(query) ||
                  p.caption?.includes(query)
                : true
            )
            .map(p => {
              const avatarSrc = p.avatarUrl ?? p.displayUrl ?? "";

              return (
                <article
                  key={p.id ?? Math.random()}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 20,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", gap: 16 }}>
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={p.username ?? ""}
                        width={60}
                        height={60}
                        style={{ borderRadius: "50%" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          background: "#111827",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                        }}
                      >
                        {p.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>@{p.username}</strong>
                        {p.fullName && <span style={{ color: "#555" }}>{p.fullName}</span>}
                        {p.followers && (
                          <span style={{ marginLeft: "auto", color: "#666" }}>
                            {formatFollowers(p.followers)} followers
                          </span>
                        )}
                      </div>
                      {p.location && <div style={{ color: "#777" }}>{p.location}</div>}
                      {p.caption && <p style={{ margin: "8px 0" }}>{p.caption}</p>}
                    </div>
                  </div>

                  {p.displayUrl && (
                    <div style={{ marginTop: 12 }}>
                      <img
                        src={p.displayUrl}
                        alt="post"
                        style={{ width: "100%", borderRadius: 8 }}
                      />
                    </div>
                  )}

                  {p.hashtags && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {p.hashtags.map(t => (
                        <span
                          key={t}
                          style={{
                            background: "#eef2ff",
                            color: "#4338ca",
                            padding: "3px 8px",
                            borderRadius: 999,
                            fontSize: 13,
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <footer style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    {p.postUrl && (
                      <a
                        href={p.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "8px 14px",
                          background: "#2563eb",
                          color: "#fff",
                          borderRadius: 6,
                          textDecoration: "none",
                        }}
                      >
                        View Post
                      </a>
                    )}
                    {p.profileUrl && (
                      <a
                        href={p.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "8px 14px",
                          border: "1px solid #ccc",
                          borderRadius: 6,
                          textDecoration: "none",
                        }}
                      >
                        View Profile
                      </a>
                    )}
                    <button
                      onClick={() => handleCopy(p)}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid #111827",
                        borderRadius: 6,
                        background: copied === (p.id ?? p.username) ? "#111827" : "#fff",
                        color: copied === (p.id ?? p.username) ? "#fff" : "#111827",
                        cursor: "pointer",
                      }}
                    >
                      {copied === (p.id ?? p.username) ? "Copied!" : "Copy DM"}
                    </button>
                  </footer>
                </article>
              );
            })}
        </div>
      )}
    </div>
  );
}
