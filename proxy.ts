import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { sessionSecretKey } from "@/lib/env";

/** Optimistic session check */

const PUBLIC_PATHS = ["/login", "/zaproszenie"];

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, sessionSecretKey(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAuthenticated = await hasValidSession(req.cookies.get("session")?.value);
  const isPublicPath = PUBLIC_PATHS.includes(path);

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|ico|ttf|woff2?)$).*)"],
};
