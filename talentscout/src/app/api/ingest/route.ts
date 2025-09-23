import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

  const normalizeUsername = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(/^@+/, '');
  };

  const normalizedItems: any[] = [];

  for (const rawItem of items) {
    const username = normalizeUsername((rawItem as any)?.username);

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const base = typeof rawItem === 'object' && rawItem !== null ? rawItem : {};

    normalizedItems.push({
      ...base,
      username,
    });
  }

  const ops = normalizedItems.map((it: any) => {
    const username = it.username as string;

    return prisma.profile.upsert({
      where: { username },
      update: {
        fullName: it.fullName ?? null,
        bio: it.bio ?? null,
        profileUrl: it.profileUrl ?? `https://instagram.com/${username}`,
        avatarUrl: it.avatarUrl ?? null,
        followers: typeof it.followers === 'number' ? it.followers : null,
        sourceHashtag: it.sourceHashtag ?? null,
        country: it.country ?? null,
      },
      create: {
        username,
        fullName: it.fullName ?? null,
        bio: it.bio ?? null,
        profileUrl: it.profileUrl ?? `https://instagram.com/${username}`,
        avatarUrl: it.avatarUrl ?? null,
        followers: typeof it.followers === 'number' ? it.followers : null,
        sourceHashtag: it.sourceHashtag ?? null,
        country: it.country ?? null,
      },
    });
  });
  
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true, count: ops.length });
}
