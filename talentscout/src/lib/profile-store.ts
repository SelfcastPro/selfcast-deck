import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import type { ProfileDTO } from '@/types';

export const PROFILE_STATUSES = ['NEW', 'CONTACTED', 'REPLIED', 'SIGNED_UP', 'NOT_INTERESTED'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export type ProfileUpsertInput = {
  username: string;
  fullName?: string;
  bio?: string;
  profileUrl?: string;
  avatarUrl?: string;
  followers?: number | null;
  sourceHashtag?: string;
  country?: string;
};

export class ProfileNotFoundError extends Error {
  constructor(id: string) {
    super(`Profile ${id} not found`);
    this.name = 'ProfileNotFoundError';
  }
}

const globalMemory = globalThis as unknown as {
  __talentscoutMemory__?: MemoryStore;
};

interface MemoryProfile {
  id: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  profileUrl: string;
  avatarUrl: string | null;
  followers: number | null;
  sourceHashtag: string | null;
  country: string | null;
  status: ProfileStatus;
  lastContactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryContactLog {
  id: string;
  profileId: string;
  scoutName?: string | null;
  message?: string | null;
  channel: string;
  createdAt: Date;
}

interface MemoryStore {
  profilesByUsername: Map<string, MemoryProfile>;
  profilesById: Map<string, MemoryProfile>;
  contactLogs: MemoryContactLog[];
}

const memoryStore: MemoryStore = (() => {
  if (!globalMemory.__talentscoutMemory__) {
    globalMemory.__talentscoutMemory__ = {
      profilesByUsername: new Map(),
      profilesById: new Map(),
      contactLogs: [],
    };
  }
  return globalMemory.__talentscoutMemory__;
})();

const toDto = (profile: {
  id: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  profileUrl: string;
  avatarUrl: string | null;
  followers: number | null;
  sourceHashtag: string | null;
  country: string | null;
  status: ProfileStatus;
}): ProfileDTO => ({
  id: profile.id,
  username: profile.username,
  fullName: profile.fullName,
  bio: profile.bio,
  profileUrl: profile.profileUrl,
  avatarUrl: profile.avatarUrl,
  followers: profile.followers,
  sourceHashtag: profile.sourceHashtag,
  country: profile.country,
  status: profile.status,
});

export async function saveProfiles(items: ProfileUpsertInput[]): Promise<number> {
  if (prisma) {
    const operations = items.map((item) => {
      const payload = {
        username: item.username,
        fullName: item.fullName ?? null,
        bio: item.bio ?? null,
        profileUrl: item.profileUrl ?? `https://instagram.com/${item.username}`,
        avatarUrl: item.avatarUrl ?? null,
        followers: typeof item.followers === 'number' ? item.followers : null,
        sourceHashtag: item.sourceHashtag ?? null,
        country: item.country ?? null,
      };
      return prisma.profile.upsert({
        where: { username: item.username },
        update: payload,
        create: payload,
      });
    });
    await prisma.$transaction(operations);
    return operations.length;
  }

  const now = new Date();
  for (const item of items) {
    const username = item.username;
    const normalized = {
      fullName: item.fullName ?? null,
      bio: item.bio ?? null,
      profileUrl: item.profileUrl ?? `https://instagram.com/${username}`,
      avatarUrl: item.avatarUrl ?? null,
      followers: typeof item.followers === 'number' ? item.followers : null,
      sourceHashtag: item.sourceHashtag ?? null,
      country: item.country ?? null,
    };

    const existing = memoryStore.profilesByUsername.get(username);
    if (existing) {
      existing.fullName = normalized.fullName;
      existing.bio = normalized.bio;
      existing.profileUrl = normalized.profileUrl;
      existing.avatarUrl = normalized.avatarUrl;
      existing.followers = normalized.followers;
      existing.sourceHashtag = normalized.sourceHashtag;
      existing.country = normalized.country;
      existing.updatedAt = now;
    } else {
      const record: MemoryProfile = {
        id: randomUUID(),
        username,
        fullName: normalized.fullName,
        bio: normalized.bio,
        profileUrl: normalized.profileUrl,
        avatarUrl: normalized.avatarUrl,
        followers: normalized.followers,
        sourceHashtag: normalized.sourceHashtag,
        country: normalized.country,
        status: 'NEW',
        lastContactedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.profilesByUsername.set(username, record);
      memoryStore.profilesById.set(record.id, record);
    }
  }
  return items.length;
}

export async function listProfiles(filter: {
  q?: string;
  status?: ProfileStatus;
} = {}): Promise<ProfileDTO[]> {
  if (prisma) {
    const where: Prisma.ProfileWhereInput = {};
    if (filter.q) {
      where.OR = [
        { username: { contains: filter.q, mode: 'insensitive' } },
        { bio: { contains: filter.q, mode: 'insensitive' } },
        { fullName: { contains: filter.q, mode: 'insensitive' } },
        { country: { contains: filter.q, mode: 'insensitive' } },
        { sourceHashtag: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    if (filter.status) {
      where.status = filter.status;
    }
    const rows = await prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(toDto);
  }

  let values = Array.from(memoryStore.profilesByUsername.values());
  if (filter.status) {
    values = values.filter((profile) => profile.status === filter.status);
  }
  if (filter.q) {
    const needle = filter.q.toLowerCase();
    values = values.filter((profile) => {
      return [
        profile.username,
        profile.bio ?? '',
        profile.fullName ?? '',
        profile.country ?? '',
        profile.sourceHashtag ?? '',
      ]
        .some((field) => field.toLowerCase().includes(needle));
    });
  }
  values.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return values.slice(0, 100).map(toDto);
}

export async function updateProfileStatus(
  id: string,
  status: ProfileStatus,
  scoutName: string,
): Promise<void> {
  if (prisma) {
    try {
      await prisma.profile.update({
        where: { id },
        data: { status, lastContactedAt: status === 'CONTACTED' ? new Date() : undefined },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ProfileNotFoundError(id);
      }
      throw error;
    }

    await prisma.contactLog.create({
      data: {
        profileId: id,
        scoutName: scoutName || undefined,
      },
    });
    return;
  }

  const record = memoryStore.profilesById.get(id);
  if (!record) {
    throw new ProfileNotFoundError(id);
  }

  const now = new Date();
  record.status = status;
  if (status === 'CONTACTED') {
    record.lastContactedAt = now;
  }
  record.updatedAt = now;

  memoryStore.contactLogs.push({
    id: randomUUID(),
    profileId: id,
    scoutName: scoutName || undefined,
    message: undefined,
    channel: 'instagram_dm',
    createdAt: now,
  });
}
