import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-secret-change-in-production",
);

const PUBLIC_PATHS = ["/login", "/zaproszenie"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow static assets, API routes, and Next.js internals
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
      isAuthenticated = true;
    } catch {
      // Token invalid or expired
    }
  }

  const isPublicPath = PUBLIC_PATHS.includes(path);

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isPublicPath) {
    const dashboardUrl = new URL("/dashboard", req.nextUrl);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
