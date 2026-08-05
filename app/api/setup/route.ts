import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";

// POST /api/setup — creates the first Manager account
// Protected by a setup key to prevent unauthorized access
export async function POST(request: Request) {
  // Only allow if no users exist yet (first-run setup)
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return NextResponse.json(
      { error: "Setup already completed. Users exist in the database." },
      { status: 400 },
    );
  }

  const setupKey = request.headers.get("x-setup-key");
  const expectedKey = process.env.SETUP_KEY;

  if (!expectedKey || setupKey !== expectedKey) {
    return NextResponse.json(
      { error: "Invalid or missing setup key" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "email, password, and name are required" },
      { status: 400 },
    );
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: hashedPassword,
      role: "MANAGER",
      active: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role },
  });
}
