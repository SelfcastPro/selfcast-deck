import { NextRequest, NextResponse } from 'next/server';
import {
  PROFILE_STATUSES,
  ProfileNotFoundError,
  type ProfileStatus,
  updateProfileStatus,
} from '@/lib/profile-store';

const statusSet = new Set<ProfileStatus>(PROFILE_STATUSES);

export async function GET(req: NextRequest) {
  const body = await req.json();
  const statusValue = String(body.status ?? '').trim().toUpperCase();
  if (!statusSet.has(statusValue as ProfileStatus)) {
    return NextResponse.json({ error: 'Bad status' }, { status: 400 });
  }

  const cookie = req.headers.get('cookie') ?? '';
  const scoutName = decodeURIComponent((/scout-name=([^;]+)/.exec(cookie)?.[1] ?? ''));

  try {
    await updateProfileStatus(params.id, statusValue as ProfileStatus, scoutName);
      } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
