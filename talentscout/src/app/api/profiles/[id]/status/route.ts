import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';


export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
const body = await req.json();
const status = String(body.status).toUpperCase();
const valid = ['NEW','CONTACTED','REPLIED','SIGNED_UP','NOT_INTERESTED'];
if (!valid.includes(status)) return NextResponse.json({ error: 'Bad status' }, { status: 400 });


const cookie = req.headers.get('cookie') ?? '';
const scoutName = decodeURIComponent((/scout-name=([^;]+)/.exec(cookie)?.[1] ?? ''));


  try {
    await prisma.profile.update({ where: { id: params.id }, data: { status, lastContactedAt: status==='CONTACTED' ? new Date() : undefined } });
    await prisma.contactLog.create({ data: { profileId: params.id, scoutName } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    throw error;
  }


return NextResponse.json({ ok: true });
}
