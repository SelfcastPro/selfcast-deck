import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


// Simple gate: require a "scout-name" cookie for all UI routes except /login and /api/ingest
export function middleware(req: NextRequest) {
const { pathname } = req.nextUrl;
const isAPIIngest = pathname.startsWith('/api/ingest');
const isLogin = pathname.startsWith('/login');


if (isAPIIngest || isLogin || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
return NextResponse.next();
}


const cookie = req.cookies.get('scout-name');
if (!cookie) {
const url = req.nextUrl.clone();
url.pathname = '/login';
return NextResponse.redirect(url);
}


return NextResponse.next();
}
```
