/** Server env */
import { z } from "zod";

const schemas = {
  DATABASE_URL: z.string().min(1, "jest wymagany"),
  SESSION_SECRET: z.string().min(32, "musi mieć min. 32 znaki (openssl rand -base64 32)"),
} as const;

type EnvName = keyof typeof schemas;

const cache = new Map<EnvName, string>();

export function requireEnv(name: EnvName): string {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const parsed = schemas[name].safeParse(process.env[name]);
  if (!parsed.success) {
    throw new Error(
      `Nieprawidłowa konfiguracja środowiska — ${name} ${parsed.error.issues[0]?.message ?? "jest nieprawidłowy"}`,
    );
  }
  cache.set(name, parsed.data);
  return parsed.data;
}

let secretKey: Uint8Array | undefined;

export function sessionSecretKey(): Uint8Array {
  secretKey ??= new TextEncoder().encode(requireEnv("SESSION_SECRET"));
  return secretKey;
}
