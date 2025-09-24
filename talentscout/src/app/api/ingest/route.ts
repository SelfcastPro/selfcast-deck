import { NextRequest, NextResponse } from 'next/server';
import { saveProfiles, type ProfileUpsertInput } from '@/lib/profile-store';

// Receives Apify payload (array of profiles). Protect with INGEST_TOKEN header.
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-ingest-token');
  if (!token || token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await req.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Expected array' }, { status: 400 });
  }

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const toTrimmedString = (value: unknown) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  };

  const normalizeUsername = (value: unknown) => {
    const trimmed = toTrimmedString(value);
    if (!trimmed) return '';
    return trimmed.replace(/^@+/, '');
  };

  const normalizeFollowers = (value: unknown) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const trimmed = String(value).trim();
    if (!trimmed) return null;

    const shorthandMatch = trimmed.match(/([-+]?\d[\d,]*(?:\.\d+)?)\s*([kmb])\b/i);
    if (shorthandMatch) {
      const [, numericPart, suffix] = shorthandMatch;
      const normalizedNumeric = numericPart.replace(/,/g, '');
      const numericValue = Number(normalizedNumeric);
      if (Number.isFinite(numericValue)) {
        const multipliers: Record<string, number> = {
          k: 1_000,
          m: 1_000_000,
          b: 1_000_000_000,
        };
        const multiplier = multipliers[suffix.toLowerCase()];
        if (multiplier !== undefined) {
          const result = numericValue * multiplier;
          if (Number.isFinite(result)) {
            return result;
          }
        }
      }
    }

    const cleaned = trimmed.replace(/[^0-9.-]/g, '');
    if (!/[0-9]/.test(cleaned)) {
      return null;
    }
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const pickHashtag = (...inputs: unknown[]) => {
    for (const value of inputs) {
      if (Array.isArray(value)) {
        for (const item of value) {
          const trimmed = toTrimmedString(item);
          if (trimmed) {
            return trimmed.replace(/^#+/, '');
          }
        }
      } else {
        const trimmed = toTrimmedString(value);
        if (trimmed) {
          return trimmed.replace(/^#+/, '');
        }
      }
    }
    return undefined;
  };
 
  const normalizedItems: ProfileUpsertInput[] = [];
  
  for (const rawItem of items) {
    const base: Record<string, unknown> = isRecord(rawItem) ? { ...rawItem } : {};
    const owner = isRecord((rawItem as any)?.owner)
      ? ({ ...(rawItem as any).owner } as Record<string, unknown>)
      : undefined;

    const rawUsername =
      base.username ?? base.userName ?? base.handle ?? base.profileName ?? base.user;
    const ownerUsername =
      base.ownerUsername ??
      base.ownerUserName ??
     (owner?.username ?? owner?.userName ?? owner?.handle);
    
    let username = normalizeUsername(rawUsername);
    if (!username) {
    username = normalizeUsername(ownerUsername);
    }

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
      
    const normalized: ProfileUpsertInput = { username };
    
    const fullName =
      toTrimmedString(
        base.fullName ?? base.name ?? base.ownerFullName ?? owner?.fullName ?? owner?.name,
      ) ?? undefined;
    if (fullName !== undefined) {
      normalized.fullName = fullName;
        }

    const bio = toTrimmedString(base.bio ?? base.biography ?? owner?.biography ?? owner?.bio);
    if (bio !== undefined) {
      normalized.bio = bio;
    }

    const profileUrl = toTrimmedString(
      base.profileUrl ??
        base.profileURL ??
        base.url ??
        base.link ??
        base.ownerProfileUrl ??
        base.ownerProfileLink ??
        base.ownerUrl ??
        owner?.profileUrl ??
        owner?.url,
    );
    if (profileUrl !== undefined) {
      normalized.profileUrl = profileUrl;
    }

    const avatarUrl = toTrimmedString(
      base.avatarUrl ??
        base.profilePicUrl ??
        base.profilePictureUrl ??
        base.ownerProfilePicUrl ??
        base.ownerProfilePictureUrl ??
        owner?.profilePicUrl ??
        owner?.profilePictureUrl,
    );
    if (avatarUrl !== undefined) {
      normalized.avatarUrl = avatarUrl;
    }

    const followers = normalizeFollowers(
      base.followers ?? base.ownerFollowers ?? base.followerCount ?? owner?.followers ?? owner?.followerCount,
    );
      if (typeof followers === 'number') {
      normalized.followers = followers;
    } else if (followers === null) {
      normalized.followers = null;
    }

    const sourceHashtag = pickHashtag(
      base.sourceHashtag,
      base.hashtag,
      owner?.sourceHashtag,
      base.hashtags,
      owner?.hashtags,
    );
    if (sourceHashtag !== undefined) {
      normalized.sourceHashtag = sourceHashtag;
    }

    const country = toTrimmedString(
      base.country ?? base.countryCode ?? base.location ?? base.ownerLocation ?? owner?.location ?? owner?.country,
    );
    if (country !== undefined) {
      normalized.country = country;
    }

    normalizedItems.push(normalized);
  }

  const count = await saveProfiles(normalizedItems);
  return NextResponse.json({ ok: true, count });
}
