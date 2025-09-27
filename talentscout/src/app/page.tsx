import { NextRequest, NextResponse } from "next/server";
import { clearBuffer, getBufferEntries, type IngestBufferEntry } from "@/lib/ingest-buffer";

const TIMESTAMP_FIELDS = [
  "bufferedAt",
  "ingestedAt",
  "createdAt",
  "created_at",
  "timestamp",
  "postedAt",
  "updatedAt",
];

export async function GET(request: NextRequest) {
  const datasetId = process.env.APIFY_DATASET_ID;
  if (!datasetId) {
    return NextResponse.json({ error: "APIFY_DATASET_ID is not configured" }, { status: 500 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "APIFY_TOKEN is not configured" }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("q")?.toLowerCase().trim();

  const { items: datasetItems, error: datasetError } = await fetchDatasetItems(datasetId, token);
  const bufferEntries = getBufferEntries();
  const bufferItems = bufferEntries.map(entry => entry.item);
  const items = mergeItems(datasetItems, bufferItems);

  const filtered = query ? filterByQuery(items, query) : items;
  const latestIngestedAt = computeLatestTimestamp(datasetItems, bufferEntries);

  if (datasetError && datasetItems.length === 0 && bufferItems.length === 0) {
    return NextResponse.json(
      { error: "Unable to load profiles from Apify", details: datasetError.message },
      { status: 502 }
    );
  }

  return NextResponse.json({
    items: filtered,
    count: filtered.length,
    latestIngestedAt,
  });
}

export async function DELETE() {
  clearBuffer();
  return NextResponse.json({ cleared: true });
}

async function fetchDatasetItems(
  datasetId: string,
  token: string
): Promise<{ items: unknown[]; error: Error | null }> {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const payload = await response.json();
    return { items: normalizeItems(payload), error: null };
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
    console.error("Failed to fetch Apify dataset", normalizedError);
    return { items: [], error: normalizedError };
  }
}

function normalizeItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.records)) return record.records;
  }
  return [];
}

function mergeItems(datasetItems: unknown[], bufferItems: unknown[]): unknown[] {
  const merged: unknown[] = [];
  const seen = new Set<string>();

  for (const item of datasetItems) {
    const key = safeDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  for (const item of bufferItems) {
    const key = safeDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function filterByQuery(items: unknown[], query: string): unknown[] {
  return items.filter(item => {
    try {
      return JSON.stringify(item).toLowerCase().includes(query);
    } catch (error) {
      return false;
    }
  });
}

function computeLatestTimestamp(datasetItems: unknown[], bufferEntries: IngestBufferEntry[]): string | null {
  let latest = Number.NEGATIVE_INFINITY;

  for (const item of datasetItems) {
    const timestamp = extractTimestamp(item);
    if (timestamp !== null) {
      latest = Math.max(latest, timestamp);
    }
  }

  for (const entry of bufferEntries) {
    const parsed = Date.parse(entry.receivedAt);
    if (Number.isFinite(parsed)) {
      latest = Math.max(latest, parsed);
    }
  }

  if (!Number.isFinite(latest)) {
    return null;
  }

  return new Date(latest).toISOString();
}

function extractTimestamp(item: unknown): number | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  for (const field of TIMESTAMP_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function safeDedupeKey(item: unknown): string {
  try {
    return typeof item === "string" ? item : JSON.stringify(item);
  } catch (error) {
    return String(item);
  }
}
talentscout/src/app/page.tsx
+126
-6

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function firstDefined<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}
@@ -167,211 +170,287 @@ function normalizeProfile(raw: UnknownRecord): Profile {
    raw.permalink,
    (raw.post as UnknownRecord | undefined)?.url
  );

  const dmCopy = firstString(raw.dmCopy, raw.dm_copy, raw.dmTemplate, raw.outreachTemplate, raw.outreach_copy);

  const location = firstString(
    raw.location,
    raw.city,
    raw.country,
    raw.profileLocation,
    (raw.owner as UnknownRecord | undefined)?.location
  );

  const hashtags = normalizeHashtags(
    firstDefined(
      raw.hashtags,
      raw.tags,
      raw.hashTags,
      raw.hashtags_text,
      (raw.post as UnknownRecord | undefined)?.hashtags,
      (raw.post as UnknownRecord | undefined)?.tags
    )
  );

  const displayUrl = firstString(
    raw.displayUrl,
    raw.display_url,
    raw.mediaUrl,
    raw.media_url,
    raw.imageUrl,
    raw.image_url,
    raw.thumbnailSrc,
    raw.thumbnail_src,
    (raw.post as UnknownRecord | undefined)?.displayUrl,
    (raw.post as UnknownRecord | undefined)?.thumbnailSrc
  );

  const timestamp = firstString(
    raw.timestamp,
    raw.postedAt,
    raw.posted_at,
    raw.takenAt,
    raw.taken_at,
    raw.publishedAt,
    raw.published_at,
    raw.createdAt,
    raw.created_at,
    (raw.post as UnknownRecord | undefined)?.takenAt,
    (raw.post as UnknownRecord | undefined)?.timestamp
  );

  const likes = parseFollowers(
    firstDefined(
      raw.likes,
      raw.likesCount,
      raw.likes_count,
      raw.likeCount,
      raw.like_count,
      raw.reactions,
      (raw.post as UnknownRecord | undefined)?.likes,
      (raw.post as UnknownRecord | undefined)?.likeCount
    )
  );

  const bufferedAt = firstString(
    raw.bufferedAt,
    raw.ingestedAt,
    raw.createdAt,
    raw.created_at,
    raw.timestamp,
    raw.postedAt,
    raw.buffered_at
  );

  const idCandidates = [
    raw.id,
    raw.profileId,
    raw.ownerId,
    raw.userId,
    raw.uid,
    raw._id,
    raw.datasetItemId,
    raw.postId,
  ];
  const id = idCandidates
    .map(candidate => {
      if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
      if (typeof candidate === "string") {
        const trimmed = candidate.trim();
        return trimmed || undefined;
      }
      return undefined;
    })
    .find(Boolean);

  return {
    id: id ?? (username ? `profile-${username}` : undefined),
    username,
    fullName,
    avatarUrl,
    followers,
    caption,
    postUrl,
    profileUrl: profileUrlCandidate ?? (username ? `https://instagram.com/${username}` : undefined),
    dmCopy,
    location,
    hashtags,
    displayUrl,
    timestamp,
    likes,
    bufferedAt,
    raw,
  };
}

function formatFollowers(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value >= 1_000) return numberFormatter.format(value);
  return value.toLocaleString("en-US");
}

function formatDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString();
}

function buildDmTemplate(profile: Profile): string | undefined {
  const explicit = profile.dmCopy?.trim();
  if (explicit) return explicit;
  const username = profile.username?.trim();
  if (username) {
    return `Hi @${username}, we’re casting for new projects! Please apply via Selfcast: https://selfcast.com`;
  }
  return "Hi! We’re casting for new projects! Please apply via Selfcast: https://selfcast.com";
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "likes" | "hashtags">("date");
  const latestRequestRef = useRef(0);
  
  const fetchProfiles = useCallback(async (search: string) => {
    const trimmed = search.trim();
    const requestId = Date.now();
    latestRequestRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      const url = `/api/profiles${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load profiles (${response.status})`);
      const json = await response.json();
      const rawList = Array.isArray(json)
        ? json
        : Array.isArray((json as any)?.profiles)
        ? (json as any).profiles
        : Array.isArray((json as any)?.items)
        ? (json as any).items
        : Array.isArray((json as any)?.data)
        ? (json as any).data
        : [];
      if (!Array.isArray(rawList)) throw new Error("Unexpected response format");
      if (latestRequestRef.current !== requestId) return;
      setProfiles(rawList.map((item: UnknownRecord) => normalizeProfile(item)));
      setActiveQuery(trimmed);
      setLastUpdated(new Date());
    } catch (err) {
      if (latestRequestRef.current !== requestId) return;
      const message = err instanceof Error ? err.message : "Unable to load profiles";
      setError(message);
      setProfiles([]);
    } finally {
      if (latestRequestRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles("");
  }, [fetchProfiles]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      fetchProfiles(query);
    },
    [fetchProfiles, query]
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProfiles(activeQuery).finally(() => setIsRefreshing(false));
  }, [activeQuery, fetchProfiles]);

  const handleCopyDm = useCallback((profile: Profile) => {
    const text = buildDmTemplate(profile);
    if (!text) return;
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    };
    const runCopy = async () => {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
    };
    runCopy()
      .then(() => {
        const id = profile.id ?? profile.username ?? text;
        setCopiedProfileId(id);
        window.setTimeout(() => {
          setCopiedProfileId(current => (current === id ? null : current));
        }, 2000);
      })
      .catch(error => {
        console.error("Failed to copy DM", error);
        alert("Unable to copy the DM text automatically. Please copy it manually.");
      });
  }, []);

  const sortedProfiles = useMemo(() => {
    const list = [...profiles];
    list.sort((a, b) => {
      if (sortBy === "likes") {
        const aLikes = a.likes ?? 0;
        const bLikes = b.likes ?? 0;
        return bLikes - aLikes;
      }
      if (sortBy === "hashtags") {
        const aCount = a.hashtags?.length ?? 0;
        const bCount = b.hashtags?.length ?? 0;
        return bCount - aCount;
      }
      const aTime = a.timestamp ?? a.bufferedAt;
      const bTime = b.timestamp ?? b.bufferedAt;
      const aDate = aTime ? new Date(aTime).getTime() : 0;
      const bDate = bTime ? new Date(bTime).getTime() : 0;
      return bDate - aDate;
    });
    return list;
  }, [profiles, sortBy]);

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>🎬 Selfcast – Instagram TalentScout</h1>
          <p style={{ margin: "8px 0 0", color: "#555" }}>
            Browse the most recent Instagram profiles collected via the webhook buffer.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter profiles (e.g. photographer, berlin, followers>10k)"
            style={{
              flex: "1 1 220px",
              minWidth: 200,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
          />
          <button
            type="submit"
@@ -389,77 +468,98 @@ export default function Page() {
            {loading && !isRefreshing ? "Searching…" : "Search"}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #111827",
              background: "#fff",
              color: "#111827",
              fontSize: 16,
              cursor: "pointer",
            }}
            disabled={loading}
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </form>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", color: "#4b5563", fontSize: 14 }}>
          <span>
            Showing <strong>{profiles.length}</strong> profile{profiles.length === 1 ? "" : "s"}
            {activeQuery ? ` for “${activeQuery}”` : ""}.
          </span>
          {lastUpdated && <span>Last updated {lastUpdated.toLocaleString()}.</span>}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={event => setSortBy(event.target.value as typeof sortBy)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111827",
              }}
            >
              <option value="date">Newest</option>
              <option value="likes">Most likes</option>
              <option value="hashtags">Most hashtags</option>
            </select>
          </label>
        </div>
        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              padding: "12px 16px",
              borderRadius: 8,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
      </header>

      {loading && !profiles.length ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#4b5563" }}>Loading profiles…</div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {sortedProfiles.map(profile => {
            const key = profile.id ?? profile.username ?? Math.random().toString(36).slice(2);
            const followersLabel = formatFollowers(profile.followers);
            const bufferedLabel = formatDateTime(profile.bufferedAt);
            const postDateLabel = formatDateTime(profile.timestamp);
            const postUrl = profile.postUrl;
            const profileUrl = profile.profileUrl;
            const dmMessage = buildDmTemplate(profile);
            const hasDmCopy = Boolean(dmMessage);
            const likesLabel = formatFollowers(profile.likes);
            return (
              <article
                key={key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 20,
                  display: "grid",
                  gap: 12,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 16 }}>
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.username ? `@${profile.username}` : "Profile avatar"}
                      width={72}
                      height={72}
                      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
@@ -500,53 +600,73 @@ export default function Page() {
                        <span style={{ color: "#6b7280", fontSize: 15 }}>{profile.fullName}</span>
                      )}
                      {followersLabel && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 14,
                            color: "#374151",
                            background: "#f3f4f6",
                            borderRadius: 999,
                            padding: "4px 10px",
                          }}
                        >
                          {followersLabel} followers
                        </span>
                      )}
                    </div>
                    {profile.location && (
                      <div style={{ color: "#4b5563", fontSize: 14, marginTop: 4 }}>{profile.location}</div>
                    )}
                    {bufferedLabel && (
                      <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                        Buffered {bufferedLabel}
                      </div>
                    )}
                    {postDateLabel && (
                      <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                        Posted {postDateLabel}
                      </div>
                    )}
                    {likesLabel && (
                      <div style={{ color: "#4b5563", fontSize: 13, marginTop: 6 }}>
                        ❤️ {likesLabel} likes
                      </div>
                    )}
                  </div>
                </div>

                {profile.displayUrl && (
                  <div style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
                    <img
                      src={profile.displayUrl}
                      alt={profile.caption ? profile.caption.slice(0, 80) : "Instagram post"}
                      style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
                    />
                  </div>
                )}

                {profile.caption && (
                  <div style={{ color: "#111827", fontSize: 15, whiteSpace: "pre-wrap" }}>{profile.caption}</div>
                )}

                {profile.hashtags && profile.hashtags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {profile.hashtags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          background: "#eef2ff",
                          color: "#4338ca",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 13,
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <footer style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
                  {postUrl && (
