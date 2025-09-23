### `src/app/api/profiles/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function GET(req: NextRequest) {
const { searchParams } = new URL(req.url);
const q = searchParams.get('q')?.trim();
const status = searchParams.get('status')?.trim() as any;


const where: any = {};
if (q) {
where.OR = [
{ username: { contains: q, mode: 'insensitive' } },
{ bio: { contains: q, mode: 'insensitive' } },
{ fullName: { contains: q, mode: 'insensitive' } },
{ country: { contains: q, mode: 'insensitive' } },
{ sourceHashtag: { contains: q, mode: 'insensitive' } },
];
}
if (status) where.status = status;


const items = await prisma.profile.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
return NextResponse.json({ items });
}
```
