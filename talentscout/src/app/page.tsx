"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

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

function parseFollowers(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const normalized = trimmed.replace(/[,\s]/g, "").toLowerCase();
    const match = normalized.match(/^([\d.]+)([kmb])?$/);
    if (match) {
      const base = Number(match[1]);
      if (!Number.isFinite(base)) return undefined;
      const suffix = match[2];
      switch (suffix) {
        case "k":
          return base * 1_000;
        case "m":
          return base * 1_000_000;
        case "b":
          return base * 1_000_000_000;
        default:
          return base;
      }
    }
    const fallback = Number(normalized);
    return Number.isFinite(fallback) ? fallback : undefined;
  }
  return undefined;
}

function normalizeHashtags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => {
        if (typeof item === "string") return item.replace(/^#/, "").trim();
        if (item && typeof item === "object" && "name" in item && typeof (item as any).name === "string") {
          return ((item as any).name as string).replace(/^#/, "").trim();
        }
        return "";
      })
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  if (typeof value === "string") {
    const normalized = value
      .split(/[\s,]+/)
      .map(token => token.replace(/^#/, "").trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  return undefined;
}

function normalizeProfile(raw: UnknownRecord): Profile {
  const username = firstString(
    raw.username,
    raw.handle,
    raw.ownerUsername,
    (raw.owner as UnknownRecord | undefined)?.username,
    (raw.user as UnknownRecord | undefined)?.username,
    (raw.profile as UnknownRecord | undefined)?.username,
    raw.instagramHandle,
    raw.igHandle
  );

  const avatarUrl = firstString(
    raw.avatarUrl,
    raw.avatar,
    raw.profilePictureUrl,
    raw.profile_picture_url,
    raw.profile_picture,
    raw.profileImageUrl,
    raw.profileImage,
    raw.profilePicUrl,
    raw.avatar_url,
    raw.profilePic,
    (raw.owner as UnknownRecord | undefined)?.profilePictureUrl
  );

  const followers = parseFollowers(
    firstDefined(
      raw.followers,
      raw.followersCount,
      raw.followers_count,
      raw.followerCount,
      raw.follower_count,
      raw.followersNum,
      raw.followers_number,
      (raw.stats as UnknownRecord | undefined)?.followers,
      (raw.profile as UnknownRecord | undefined)?.followers
    )
  );

  const caption = firstString(
    raw.caption,
    raw.postCaption,
    raw.latestCaption,
    (raw.post as UnknownRecord | undefined)?.caption,
    raw.description,
    raw.caption_text
  );

  const fullName = firstString(
    raw.fullName,
    raw.name,
    raw.ownerFullName,
    (raw.owner as UnknownRecord | undefined)?.fullName,
    (raw.user as UnknownRecord | undefined)?.fullName
  );

  const profileUrlCandidate = firstString(
    raw.profileUrl,
    raw.profile_url,
    raw.ownerProfileUrl,
    (raw.owner as UnknownRecord | undefined)?.profileUrl,
    (raw.user as UnknownRecord | undefined)?.url,
    raw.urlProfile,
    raw.link
  );

  const postUrl = firstString(
    raw.postUrl,
    raw.post_url,
    raw.url,
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

export default function Page() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null);
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
    if (!profile.dmCopy) return;
    const text = profile.dmCopy;
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
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
            }}
            disabled={loading}
          >
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
          {profiles.map(profile => {
            const key = profile.id ?? profile.username ?? Math.random().toString(36).slice(2);
            const followersLabel = formatFollowers(profile.followers);
            const bufferedLabel = formatDateTime(profile.bufferedAt);
            const postUrl = profile.postUrl;
            const profileUrl = profile.profileUrl;
            const hasDmCopy = Boolean(profile.dmCopy);
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
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        flexShrink: 0,
                      }}
                    >
                      👤
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {profile.username ? (
                        <a
                          href={profileUrl ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontWeight: 600,
                            fontSize: 18,
                            color: "#111827",
                            textDecoration: "none",
                          }}
                        >
                          @{profile.username}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: 18, color: "#111827" }}>Unknown username</span>
                      )}
                      {profile.fullName && (
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
                  </div>
                </div>

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
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "9px 14px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        textDecoration: "none",
                        color: "#111827",
                        fontSize: 14,
                      }}
                    >
                      View Post
                    </a>
                  )}
                  {profileUrl && !postUrl && (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "9px 14px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        textDecoration: "none",
                        color: "#111827",
                        fontSize: 14,
                      }}
                    >
                      View Profile
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyDm(profile)}
                    disabled={!hasDmCopy}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: hasDmCopy ? "#2563eb" : "#d1d5db",
                      color: hasDmCopy ? "#fff" : "#6b7280",
                      fontSize: 14,
                      cursor: hasDmCopy ? "pointer" : "not-allowed",
                    }}
                  >
                    {copiedProfileId && (copiedProfileId === profile.id || copiedProfileId === profile.username)
                      ? "Copied!"
                      : "Copy DM"}
                  </button>
                </footer>
              </article>
            );
          })}
          {!profiles.length && !loading && !error && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#6b7280" }}>
              No profiles found for the current filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
