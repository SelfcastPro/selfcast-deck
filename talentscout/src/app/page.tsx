"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeProfile(raw: UnknownRecord): Profile {
  return {
    id: (raw.id as string) ?? raw.permalink?.toString(),
    username: firstString(raw.username),
    fullName: firstString(raw.fullName),
    avatarUrl: firstString(raw.avatarUrl),
    caption: firstString(raw.caption),
    postUrl: firstString(raw.url, raw.postUrl),
    profileUrl:
      firstString(raw.profileUrl) ??
      (raw.username ? `https://instagram.com/${raw.username}` : undefined),
    displayUrl: firstString(raw.displayUrl),
    timestamp: firstString(raw.timestamp),
    likes: typeof raw.likes === "number" ? raw.likes : undefined,
    bufferedAt: firstString(raw.bufferedAt, raw.ingestedAt),
    raw,
  };
}

function formatFollowers(n?: number) {
  return n === undefined ? undefined : n >= 1_000 ? numberFormatter.format(n) : n.toString();
}

function buildDm(profile: Profile): string {
  return profile.dmCopy?.trim()
    ? profile.dmCopy
    : profile.username
    ? `Hi @${profile.username}, we’re casting for new projects! ✨ Please apply via Selfcast: https://selfcast.com`
    : "Hi! We’re casting for new projects! Please apply via Selfcast: https://selfcast.com";
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "likes" | "hashtags">("date");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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
      return (
        new Date(b.timestamp ?? b.bufferedAt ?? 0).getTime() -
        new Date(a.timestamp ?? a.bufferedAt ?? 0).getTime()
      );
    });
    return list;
  }, [profiles, sortBy]);

  const handleCopy = (p: Profile) => {
    const key = p.id ?? p.username ?? "";
    const text = drafts[key] ?? buildDm(p);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1>🎬 Selfcast – Instagram TalentScout</h1>
        <form
          onSubmit={(e: FormEvent) => e.preventDefault()}
          style={{ display: "flex", gap: 12, marginTop: 12 }}
        >
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter profiles (e.g. berlin, followers>10k)"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
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
              const defaultMsg = buildDm(p);
              const key = p.id ?? p.username ?? "";

              return (
                <article
                  key={key}
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
                      <strong>@{p.username}</strong>
                      {p.fullName && (
                        <span style={{ marginLeft: 8, color: "#555" }}>{p.fullName}</span>
                      )}
                      {p.followers && (
                        <span style={{ marginLeft: "auto", color: "#666" }}>
                          {formatFollowers(p.followers)} followers
                        </span>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={drafts[key] ?? defaultMsg}
                    onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: 14,
                      resize: "vertical",
                    }}
                  />

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
                        background: copied === key ? "#111827" : "#fff",
                        color: copied === key ? "#fff" : "#111827",
                        cursor: "pointer",
                      }}
                    >
                      {copied === key ? "Copied!" : "Copy DM"}
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
