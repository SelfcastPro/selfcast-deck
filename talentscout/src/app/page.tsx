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

function normalizeHashtags(value: unknown): string[] | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  const addTag = (tag: string) => {
    const cleaned = tag.replace(/^#+/, "").trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(cleaned);
  };

  const handle = (input: unknown) => {
    if (input === null || input === undefined) return;
    if (Array.isArray(input)) {
      for (const entry of input) {
        handle(entry);
      }
      return;
    }
    if (typeof input === "string") {
      const parts = input.split(/[\s,]+/);
      for (const part of parts) {
        addTag(part);
      }
      return;
    }
    if (typeof input === "object") {
      const record = input as UnknownRecord;
      const candidate = firstString(record.name, record.tag, record.value);
      if (candidate) {
        handle(candidate);
      }
    }
  };

  handle(value);

  return tags.length > 0 ? tags : undefined;
}

function parseNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const normalized = trimmed.replace(/,/g, "");
    const compactMatch = normalized.match(/^(-?\d+(?:\.\d+)?)([kKmM]?)$/);
    if (compactMatch) {
      const base = Number(compactMatch[1]);
      if (!Number.isFinite(base)) return undefined;
      const suffix = compactMatch[2].toLowerCase();
      const multiplier = suffix == "k" ? 1_000 : suffix == "m" ? 1_000_000 : 1;
      return base * multiplier;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseFollowers(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as UnknownRecord;
    const nested = firstDefined(record.count, record.value, record.total);
    if (nested !== undefined) {
      return parseFollowers(nested);
    }
  }

  const numeric = parseNumericValue(value);
  if (numeric === undefined) return undefined;
  return Math.round(numeric);
}

function normalizeProfile(raw: UnknownRecord): Profile {
  const owner = raw.owner as UnknownRecord | undefined;
  const post = raw.post as UnknownRecord | undefined;

  const username = firstString(
    raw.username,
    raw.userName,
    raw.user_name,
    raw.handle,
    raw.instagramHandle,
    raw.instagram_handle,
    owner?.username,
    owner?.userName,
    owner?.handle
  );

  const fullName = firstString(
    raw.fullName,
    raw.full_name,
    raw.name,
    raw.displayName,
    raw.display_name,
    owner?.fullName,
    owner?.full_name,
    owner?.name
  );

  const avatarUrl = firstString(
    raw.avatarUrl,
    raw.avatar_url,
    raw.profilePicture,
    raw.profile_picture,
    raw.profilePic,
    raw.profile_pic,
    raw.profilePicUrl,
    raw.profile_pic_url,
    raw.profilePictureUrl,
    raw.profile_picture_url,
    owner?.avatarUrl,
    owner?.avatar_url,
    owner?.profilePicture,
    owner?.profile_picture,
    owner?.profilePicUrl,
    owner?.profile_pic_url
  );

  const followers = parseFollowers(
    firstDefined(
      raw.followers,
      raw.followersCount,
      raw.followers_count,
      raw.followerCount,
      raw.follower_count,
      raw.followersTotal,
      raw.followers_total,
      owner?.followers,
      owner?.followersCount,
      owner?.followers_count
    )
  );

  const caption = firstString(
    raw.caption,
    raw.postCaption,
    raw.post_caption,
    raw.description,
    raw.postDescription,
    raw.post_description,
    post?.caption,
    post?.description
  );

  const postUrl = firstString(
    raw.postUrl,
    raw.post_url,
    raw.url,
    raw.permalink,
    raw.link,
    post?.url,
    post?.permalink
  );

  const profileUrlCandidate = firstString(
    raw.profileUrl,
    raw.profile_url,
    raw.profileLink,
    raw.profile_link,
    raw.profilePage,
    raw.profile_page,
    raw.url,
    owner?.profileUrl,
    owner?.profile_url,
    owner?.profileLink,
    owner?.profile_link,
    owner?.url
  );

  const dmCopy = firstString(raw.dmCopy, raw.dm_copy, raw.dmTemplate, raw.outreachTemplate, raw.outreach_copy);

  const location = firstString(raw.location, raw.city, raw.country, raw.profileLocation, owner?.location);

  const hashtags = normalizeHashtags(
    firstDefined(raw.hashtags, raw.tags, raw.hashTags, raw.hashtags_text, post?.hashtags, post?.tags)
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
    post?.displayUrl,
    post?.thumbnailSrc,
    post?.imageUrl,
    post?.image_url
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
    post?.takenAt,
    post?.timestamp,
    post?.createdAt,
    post?.created_at
  );

  const likes = parseFollowers(
    firstDefined(
      raw.likes,
      raw.likesCount,
      raw.likes_count,
      raw.likeCount,
      raw.like_count,
      raw.reactions,
      post?.likes,
      post?.likeCount,
      post?.like_count
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
@@ -310,51 +308,50 @@ function firstDefined<T>(...values: T[]): T | undefined {
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
@@ -401,279 +398,404 @@ export default function Page() {
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
    if (typeof window === "undefined") return;

    const text = buildDmTemplate(profile);
    if (!text) return;

    const fallbackCopy = () => {
      if (typeof document === "undefined") {
        throw new Error("Document is not available for clipboard fallback");
      }
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
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
    };

    runCopy()
      .then(() => {
        const id = profile.id ?? profile.username ?? text;
        setCopiedProfileId(id);
        setTimeout(() => {
          setCopiedProfileId(current => (current === id ? null : current));
        }, 2000);
      })
      .catch(error => {
        console.error("Failed to copy DM", error);
        if (typeof alert === "function") {
          alert("Unable to copy the DM text automatically. Please copy it manually.");
        }
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
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
            }}
            disabled={loading && !isRefreshing}
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            color: "#4b5563",
            fontSize: 14,
          }}
        >
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
            const resolvedProfileUrl = profileUrl ?? (profile.username ? `https://instagram.com/${profile.username}` : undefined);
            const dmMessage = buildDmTemplate(profile);
            const likesLabel = formatFollowers(profile.likes);
            const copyTarget = profile.id ?? profile.username ?? dmMessage ?? key;
            const isCopied = copiedProfileId === copyTarget;
            const avatarFallback =
              profile.username?.charAt(0)?.toUpperCase() ??
              profile.fullName?.charAt(0)?.toUpperCase() ??
              "👤";

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
                        background: "#111827",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: 24,
                        flexShrink: 0,
                      }}
                    >
                      {avatarFallback}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {profile.username ? (
                        <a
                          href={resolvedProfileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            textDecoration: "none",
                            fontSize: 18,
                          }}
                        >
                          @{profile.username}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600, color: "#111827", fontSize: 18 }}>
                          {profile.fullName ?? "Unknown profile"}
                        </span>
                      )}
                      {profile.fullName && profile.username && (
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
                      <div style={{ color: "#4b5563", fontSize: 14 }}>{profile.location}</div>
                    )}
                    {bufferedLabel && (
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Buffered {bufferedLabel}</div>
                    )}
                    {postDateLabel && (
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Posted {postDateLabel}</div>
                    )}
                    {likesLabel && (
                      <div style={{ color: "#4b5563", fontSize: 13 }}>❤️ {likesLabel} likes</div>
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
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        background: "#2563eb",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: 14,
                      }}
                    >
                      View post
                    </a>
                  )}
                  {resolvedProfileUrl && (
                    <a
                      href={resolvedProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        color: "#111827",
                        textDecoration: "none",
                        fontSize: 14,
                      }}
                    >
                      View profile
                    </a>
                  )}
                  {dmMessage && (
                    <button
                      type="button"
                      onClick={() => handleCopyDm(profile)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid #111827",
                        background: isCopied ? "#111827" : "#fff",
                        color: isCopied ? "#fff" : "#111827",
                        cursor: "pointer",
                      }}
                    >
                      {isCopied ? "Copied!" : "Copy DM"}
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
