/** Trim Vercel/dashboard paste artifacts from env values. */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getSupabaseUrl(): string | undefined {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
}

/** Anon / publishable key for public inserts (guest form). */
export function getSupabaseAnonKey(): string | undefined {
  return (
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("SUPABASE_ANON_KEY")
  );
}

/**
 * Service role / secret key for staff reads (bypasses RLS).
 * Accepts legacy JWT `service_role` and new `sb_secret_…` keys.
 */
export function getSupabaseServiceKey(): string | undefined {
  return (
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ??
    readEnv("SUPABASE_SECRET_KEY")
  );
}

type KeyKind = "service" | "anon" | "publishable" | "secret" | "unknown";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function classifySupabaseKey(key: string): KeyKind {
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("eyJ")) {
    const payload = decodeJwtPayload(key);
    const role = payload?.role;
    if (role === "service_role") return "service";
    if (role === "anon") return "anon";
  }
  return "unknown";
}

/** Safe, non-secret description of which env key was resolved. */
export function describeServiceKeySource(): string {
  if (readEnv("SUPABASE_SERVICE_ROLE_KEY")) return "SUPABASE_SERVICE_ROLE_KEY";
  if (readEnv("SUPABASE_SECRET_KEY")) return "SUPABASE_SECRET_KEY";
  return "(missing)";
}

export function describeAnonKeySource(): string {
  if (readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }
  if (readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  }
  if (readEnv("SUPABASE_ANON_KEY")) return "SUPABASE_ANON_KEY";
  return "(missing)";
}
