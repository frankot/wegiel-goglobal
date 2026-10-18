import { hash, compare } from "bcryptjs";
import { createHash } from "node:crypto";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return compare(password, hashedPassword);
}

const DUMMY_HASH = "$2b$10$cnUpjFgpMhgx.yY5Pg65kecSiSWvov24VPqmOl620cmh2NhSSdOeG";

export async function burnPasswordCheck(password: string): Promise<void> {
  await compare(password, DUMMY_HASH);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
