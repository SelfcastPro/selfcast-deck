import { NextResponse } from "next/server";

// Paths that require auth
const PROTECTED = ["/", "/deckroles"];

export function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Skip protection for static assets, api, and /view (read-only)
  if (path.startsWith("/api") || path.startsWith("/view") || path.startsWith("/public")) {
    return NextResponse.next();
  }

  // Only gate protected paths
  if (!PROTECTED.some(p => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("sc_auth");
  if (cookie?.value === "ok") return NextResponse.next();

  // Not authenticated -> send to /login
  const loginUrl = new URL("/login/", req.url);
  loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next|.*\\.(?:css|js|png|jpg|jpeg|svg|ico|txt)).*)"],
};
