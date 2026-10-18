import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

/** GET /api/auth/session-expired */
export async function GET(req: Request) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", req.url));
}
