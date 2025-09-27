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
  if (value === null || value === undefined) return undefined;

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
      for (const entry of input) handle(entry);
      return;
    }

    if (typeof input === "string") {
      const parts = input.split(/[\s,]+/);
      for (const part of parts) addTag(part);
      return;
    }

    if (typeof input === "object") {
      const record = input as UnknownRecord;
      const candidate = firstString(record.name, record.tag, record.value);
      if (candidate) handle(candidate);
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
      if (suffix === "k") return base * 1_000;
      if (suffix === "m") return base * 1_000_000;
      return base;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function extractUsername(raw: UnknownRecord, owner?: UnknownRecord) {
  return firstString(
    raw.username,
    raw.userName,
    raw.handle,
    raw.instagramHandle,
    owner?.username,
    owner?.handle
  );
}

function extractFullName(raw: UnknownRecord, owner?: UnknownRecord) {
  return firstString(raw.fullName, raw.name, raw.displayName, owner?.fullName, owner?.name);
}

function extractAvatarUrl(raw: UnknownRecord, owner?: UnknownRecord) {
  return firstString(
    raw.avatarUrl,
    raw.avatar_url,
    raw.profilePicture,
    raw.profilePic,
    owner?.avatarUrl,
    owner?.profilePicture
  );
}

function extractFollowersCount(raw: UnknownRecord, owner?: UnknownRecord): number | undefined {
  return parseNumericValue(
    firstDefined(
      raw.followers,
      raw.followersCount,
      raw.followerCount,
      owner?.followers,
      owner?.followersCount
    )
  );
}

function extractCaption(raw: UnknownRecord, post?: UnknownRecord) {
  return firstString(raw.caption, raw.description, post?.caption, post?.description);
}

function extractPostUrl(raw: UnknownRecord, post?: UnknownRecord) {
  return firstString(raw.postUrl, raw.url, raw.permalink, post?.url, post?.permalink);
}

function extractProfileUrl(raw: UnknownRecord, owner: UnknownRecord | undefined, username?: string) {
  const explicit = firstString(raw.profileUrl, owner?.profileUrl, raw.url, owner?.url);
  if (explicit) return explicit;
  if (username) return `https://instagram.com/${username}`;
  return undefined;
}

function extractHashtags(raw: UnknownRecord, post?: UnknownRecord) {
  return normalizeHashtags(firstDefined(raw.hashtags, post?.hashtags));
}

function extractDisplayImageUrl(raw: UnknownRecord, post?: UnknownRecord) {
  return firstString(raw.displayUrl, raw.mediaUrl, raw.imageUrl, post?.displayUrl, post?.mediaUrl);
}

function extractTimestamp(raw: UnknownRecord, post?: UnknownRecord) {
  return firstString(raw.timestamp, raw.takenAt, raw.createdAt, post?.timestamp, post?.createdAt);
}

function extractLikes(raw: UnknownRecord, post?: UnknownRecord) {
  return parseNumericValue(firstDefined(raw.likes, raw.likesCount, post?.likes, post?.likesCount));
}

function normalizeProfile(raw: UnknownRecord): Profile {
  const owner = toRecord(raw.owner);
  const post = toRecord(raw.post);
  const username = extractUsername(raw, owner);

  return {
    id: raw.id as string,
    username,
    fullName: extractFullName(raw, owner),
    avatarUrl: extractAvatarUrl(raw, owner),
    followers: extractFollowersCount(raw, owner),
    caption: extractCaption(raw, post),
    postUrl: extractPostUrl(raw, post),
    profileUrl: extractProfileUrl(raw, owner, username),
    hashtags: extractHashtags(raw, post),
    displayUrl: extractDisplayImageUrl(raw, post),
    timestamp: extractTimestamp(raw, post),
    likes: extractLikes(raw, post),
    raw,
  };
}

function formatFollowers(value: number | undefined) {
  if (value === undefined) return undefined;
  if (value >= 1_000) return numberFormatter.format(value);
  return value.toLocaleString("en-US");
}

function buildDmTemplate(profile: Profile): string {
  if (profile.dmCopy?.trim()) return profile.dmCopy.trim();
  if (profile.username) {
    return `Hi @${profile.username}, we’re casting for new projects! Please apply via Selfcast: https://selfcast.com`;
  }
  return "Hi! We’re casting for new projects! Please apply via Selfcast: https://selfcast.com";
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profiles")
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data.items) ? data.items : [];
setProfiles(items.map((item: unknown) => normalizeProfile(item as UnknownRecord)));
      })
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>🎬 Selfcast – Instagram TalentScout</h1>
      <form
        onSubmit={e => {
          e.preventDefault();
        }}
      >
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter profiles (e.g. berlin, followers>10k)"
        />
      </form>
      {loading && <p>Loading…</p>}
      {!loading &&
        profiles.map(p => (
          <div key={p.id} style={{ margin: "12px 0", padding: 12, border: "1px solid #ccc" }}>
            <strong>@{p.username}</strong>
            <p>{p.caption}</p>
            {p.displayUrl && <img src={p.displayUrl} alt="" width={200} />}
            <button
              onClick={() => {
                navigator.clipboard.writeText(buildDmTemplate(p));
              }}
            >
              Copy DM
            </button>
          </div>
        ))}
    </div>
  );
}
