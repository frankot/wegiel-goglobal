import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { signupSchema } from "@/schemas/auth";

const setupBodySchema = signupSchema.omit({ token: true }).extend({
  email: z.string().trim().email("Nieprawidłowy format adresu e-mail"),
});

function keyMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

class SetupDoneError extends Error {}

// POST /api/setup
export async function POST(request: Request) {
  const expectedKey = process.env.SETUP_KEY;
  if (!expectedKey || !keyMatches(request.headers.get("x-setup-key"), expectedKey)) {
    return NextResponse.json({ error: "Invalid or missing setup key" }, { status: 401 });
  }

  const body = setupBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { email, name, password } = body.data;
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.$transaction(
      async (tx) => {
        if ((await tx.user.count()) > 0) throw new SetupDoneError();
        return tx.user.create({
          data: { email, name, passwordHash, role: "MANAGER", active: true },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    if (e instanceof SetupDoneError) {
      return NextResponse.json(
        { error: "Setup already completed. Users exist in the database." },
        { status: 400 },
      );
    }
    console.error("Setup nie powiódł się:", e);
    return NextResponse.json({ error: "Setup failed, try again." }, { status: 409 });
  }
}
