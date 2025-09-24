import { NextRequest, NextResponse } from 'next/server';
import { listProfiles, PROFILE_STATUSES, type ProfileStatus } from '@/lib/profile-store';

const statusSet = new Set<ProfileStatus>(PROFILE_STATUSES);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const rawStatus = searchParams.get('status')?.trim().toUpperCase();
  const status = rawStatus && statusSet.has(rawStatus as ProfileStatus)
    ? (rawStatus as ProfileStatus)
    : undefined;

 const items = await listProfiles({ q: q || undefined, status });
  return NextResponse.json({ items });
}
