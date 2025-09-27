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

function toRecord(value: unknown): UnknownRecord | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function firstDefined<T>(...values: (T | null | undefined)[]): T | undefined {
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
@@ -83,305 +90,463 @@ function normalizeHashtags(value: unknown): string[] | undefined {
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
      const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1;
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

function extractUsername(raw: UnknownRecord, owner?: UnknownRecord): string | undefined {
  return firstString(
    raw.username,
    raw.userName,
    raw.user_name,
    raw.handle,
    raw.instagramHandle,
    raw.instagram_handle,
    owner?.username,
    owner?.userName,
    owner?.handle,
    owner?.instagramHandle,
    owner?.instagram_handle
  );
}

function extractFullName(raw: UnknownRecord, owner?: UnknownRecord): string | undefined {
  return firstString(
    raw.fullName,
    raw.full_name,
    raw.name,
    raw.displayName,
    raw.display_name,
    owner?.fullName,
    owner?.full_name,
    owner?.name,
    owner?.displayName
  );
}

function extractAvatarUrl(raw: UnknownRecord, owner?: UnknownRecord): string | undefined {
  return firstString(
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
}

function extractFollowersCount(raw: UnknownRecord, owner?: UnknownRecord): number | undefined {
  return parseFollowers(
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
      owner?.followers_count,
      owner?.followerCount,
      owner?.follower_count
    )
  );
}

function extractCaption(raw: UnknownRecord, post?: UnknownRecord): string | undefined {
  return firstString(
    raw.caption,
    raw.postCaption,
    raw.post_caption,
    raw.description,
    raw.postDescription,
    raw.post_description,
    post?.caption,
    post?.description
  );
}

function extractPostUrl(raw: UnknownRecord, post?: UnknownRecord): string | undefined {
  return firstString(
    raw.postUrl,
    raw.post_url,
    raw.url,
    raw.permalink,
    raw.link,
    post?.url,
    post?.permalink,
    post?.link
  );
}

function extractProfileUrl(
  raw: UnknownRecord,
  owner: UnknownRecord | undefined,
  username: string | undefined
): string | undefined {
  const explicit = firstString(
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

  if (explicit) {
    return explicit;
  }

  if (username) {
    return `https://instagram.com/${username}`;
  }

  return undefined;
}

function extractDmCopy(raw: UnknownRecord): string | undefined {
  return firstString(raw.dmCopy, raw.dm_copy, raw.dmTemplate, raw.outreachTemplate, raw.outreach_copy);
}

function extractLocation(raw: UnknownRecord, owner?: UnknownRecord): string | undefined {
  return firstString(
    raw.location,
    raw.city,
    raw.country,
    raw.profileLocation,
    raw.profile_location,
    owner?.location,
    owner?.city,
    owner?.country
  );
}

function extractHashtags(raw: UnknownRecord, post?: UnknownRecord): string[] | undefined {
  return normalizeHashtags(
    firstDefined(raw.hashtags, raw.tags, raw.hashTags, raw.hashtags_text, post?.hashtags, post?.tags)
  );
}

function extractDisplayImageUrl(raw: UnknownRecord, post?: UnknownRecord): string | undefined {
  return firstString(
    raw.displayUrl,
    raw.display_url,
    raw.mediaUrl,
    raw.media_url,
    raw.imageUrl,
    raw.image_url,
    raw.thumbnailSrc,
    raw.thumbnail_src,
    post?.displayUrl,
    post?.display_url,
    post?.thumbnailSrc,
    post?.imageUrl,
    post?.image_url
  );
}

function extractTimestamp(raw: UnknownRecord, post?: UnknownRecord): string | undefined {
  return firstString(
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
    post?.taken_at,
    post?.timestamp,
    post?.createdAt,
    post?.created_at
  );
}

function extractLikes(raw: UnknownRecord, post?: UnknownRecord): number | undefined {
  return parseFollowers(
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
}

function extractBufferedAt(raw: UnknownRecord): string | undefined {
  return firstString(
    raw.bufferedAt,
    raw.buffered_at,
    raw.ingestedAt,
    raw.ingested_at,
    raw.createdAt,
    raw.created_at,
    raw.timestamp,
    raw.postedAt,
    raw.posted_at
  );
}

function extractPostId(
  raw: UnknownRecord,
  owner: UnknownRecord | undefined,
  post: UnknownRecord | undefined,
  username: string | undefined
): string | undefined {
  const candidates: unknown[] = [
    raw.id,
    raw.profileId,
    raw.ownerId,
    raw.userId,
    raw.uid,
    raw._id,
    raw.datasetItemId,
    raw.postId,
    owner?.id,
    owner?.userId,
    owner?.uid,
    post?.id,
    post?.postId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    } else if (typeof candidate === "number" || typeof candidate === "bigint") {
      return String(candidate);
    }
  }

  if (username) {
    return `profile-${username}`;
  }

  return undefined;
}

function normalizeProfile(raw: UnknownRecord): Profile {
  const owner = toRecord(raw.owner);
  const post = toRecord(raw.post);

  const username = extractUsername(raw, owner);

  return {
    id: extractPostId(raw, owner, post, username),
    username,
    fullName: extractFullName(raw, owner),
    avatarUrl: extractAvatarUrl(raw, owner),
    followers: extractFollowersCount(raw, owner),
    caption: extractCaption(raw, post),
    postUrl: extractPostUrl(raw, post),
    profileUrl: extractProfileUrl(raw, owner, username),
    dmCopy: extractDmCopy(raw),
    location: extractLocation(raw, owner),
    hashtags: extractHashtags(raw, post),
    displayUrl: extractDisplayImageUrl(raw, post),
    timestamp: extractTimestamp(raw, post),
    likes: extractLikes(raw, post),
    bufferedAt: extractBufferedAt(raw),
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "likes" | "hashtags">("date");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null);

  const latestRequestRef = useRef(0);

  const fetchProfiles = useCallback(
    async (inputQuery: string) => {
      const trimmedQuery = inputQuery.trim();
      const requestId = Date.now();
      latestRequestRef.current = requestId;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (trimmedQuery) {
          params.set("q", trimmedQuery);
        }

        const response = await fetch(`/api/profiles${params.toString() ? `?${params.toString()}` : ""}`, {
          cache: "no-store",
        });

        let payload: unknown;
        try {
          payload = await response.json();
        } catch (error) {
          payload = null;
        }

        if (!response.ok) {
          const message =
            payload && typeof (payload as { error?: unknown }).error === "string"
              ? (payload as { error: string }).error
              : `Request failed with status ${response.status}`;
          throw new Error(message);
        }

        const data = (payload ?? {}) as {
          items?: unknown[];
          error?: string;
          latestIngestedAt?: string | null;
        };

        const items = Array.isArray(data.items) ? data.items : [];
        const normalized = items.map(item => normalizeProfile((item ?? {}) as UnknownRecord));

        if (latestRequestRef.current !== requestId) {
          return;
        }

        setProfiles(normalized);
        setActiveQuery(trimmedQuery);
        setError(typeof data.error === "string" ? data.error : null);

        const timestamp = typeof data.latestIngestedAt === "string" ? Date.parse(data.latestIngestedAt) : NaN;
        setLastUpdated(Number.isFinite(timestamp) ? new Date(timestamp) : new Date());
      } catch (error) {
        if (latestRequestRef.current !== requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        setError(message);
        setProfiles([]);
        setActiveQuery(trimmedQuery);
        setLastUpdated(null);
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    []
  );

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
