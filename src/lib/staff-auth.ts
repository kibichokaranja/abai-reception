import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { StaffUserRole } from "@/lib/types";

export const STAFF_COOKIE = "abai_staff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const BCRYPT_ROUNDS = 10;

export type StaffRole = StaffUserRole;

function getSecret(): Uint8Array {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("STAFF_SESSION_SECRET must be set (min 16 characters)");
  }
  return new TextEncoder().encode(secret);
}

export function staffPasswordConfigured(): boolean {
  return Boolean(process.env.STAFF_PASSWORD && process.env.STAFF_PASSWORD.length > 0);
}

export function receptionPasswordConfigured(): boolean {
  return Boolean(
    process.env.RECEPTION_PASSWORD && process.env.RECEPTION_PASSWORD.length > 0,
  );
}

export function managementPasswordConfigured(): boolean {
  return Boolean(
    process.env.MANAGEMENT_PASSWORD && process.env.MANAGEMENT_PASSWORD.length > 0,
  );
}

export function verifyStaffPassword(password: string): boolean {
  const expected = process.env.STAFF_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export function verifyReceptionPassword(password: string): boolean {
  const expected = process.env.RECEPTION_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export function verifyManagementPassword(password: string): boolean {
  const expected = process.env.MANAGEMENT_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function hashStaffPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyStaffPasswordHash(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

/** True when at least one active DB user exists for the role. */
export async function hasActiveDbUserForRole(role: StaffRole): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient();
    const { count, error } = await supabase
      .from("staff_users")
      .select("id", { count: "exact", head: true })
      .eq("role", role)
      .eq("active", true);
    if (error) {
      console.error("staff_users count failed", error);
      return false;
    }
    return (count ?? 0) > 0;
  } catch (err) {
    console.error("staff_users lookup unavailable", err);
    return false;
  }
}

/**
 * Authenticate a portal login.
 * DB users: require username + password only (display name is create-user metadata).
 * Env bootstrap (only while no DB user for role): password only; username optional.
 */
export async function authenticatePortalLogin(options: {
  role: StaffRole;
  username?: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const password = options.password;
  const username = options.username?.trim() ?? "";

  if (!password) {
    return { ok: false, error: "Password is required", status: 400 };
  }

  const hasDbUser = await hasActiveDbUserForRole(options.role);

  if (hasDbUser || username.length > 0) {
    if (!username) {
      return { ok: false, error: "Username is required", status: 400 };
    }

    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("staff_users")
        .select("id, password_hash, role, active, username")
        .eq("username", username)
        .maybeSingle();

      if (error) {
        console.error("staff_users login select failed", error);
        return {
          ok: false,
          error:
            "Could not look up users. Run supabase/migrations/20260330_staff_users.sql if not applied.",
          status: 500,
        };
      }
      if (!data || !data.active || data.role !== options.role) {
        return {
          ok: false,
          error: "Incorrect username or password",
          status: 401,
        };
      }

      const match = await verifyStaffPasswordHash(password, data.password_hash);
      if (!match) {
        return {
          ok: false,
          error: "Incorrect username or password",
          status: 401,
        };
      }
      return { ok: true };
    } catch (err) {
      console.error(err);
      return {
        ok: false,
        error: "Staff user login is unavailable (check Supabase service role).",
        status: 503,
      };
    }
  }

  // Env password bootstrap — only while no DB user exists for the role.
  const envOk =
    options.role === "owner"
      ? staffPasswordConfigured() && verifyStaffPassword(password)
      : options.role === "management"
        ? managementPasswordConfigured() && verifyManagementPassword(password)
        : receptionPasswordConfigured() && verifyReceptionPassword(password);

  if (!envOk) {
    const missing =
      options.role === "owner"
        ? !staffPasswordConfigured()
        : options.role === "management"
          ? !managementPasswordConfigured()
          : !receptionPasswordConfigured();
    if (missing) {
      const varName =
        options.role === "owner"
          ? "STAFF_PASSWORD"
          : options.role === "management"
            ? "MANAGEMENT_PASSWORD"
            : "RECEPTION_PASSWORD";
      return {
        ok: false,
        error: `${varName} is not configured on the server.`,
        status: 503,
      };
    }
    return { ok: false, error: "Incorrect password", status: 401 };
  }

  return { ok: true };
}

export async function createStaffSessionToken(role: StaffRole): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

function normalizeRole(raw: unknown): StaffRole | null {
  // Legacy sessions used role: "staff" — treat as owner.
  if (raw === "owner" || raw === "staff") return "owner";
  if (raw === "management") return "management";
  if (raw === "reception") return "reception";
  return null;
}

async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ role: StaffRole } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = normalizeRole(payload.role);
    if (!role) return null;
    return { role };
  } catch {
    return null;
  }
}

export async function getStaffSession(): Promise<{ role: StaffRole } | null> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Prefer Next cookies(); fall back to the raw Cookie header so export/API
 * routes still authenticate when the cookie jar is empty in edge cases.
 */
export async function getStaffSessionFromRequest(
  request: Request,
): Promise<{ role: StaffRole } | null> {
  const fromJar = await getStaffSession();
  if (fromJar) return fromJar;

  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STAFF_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(STAFF_COOKIE.length + 1));
  return verifySessionToken(token);
}

/** Owner (/staff) session — legacy name kept for existing call sites. */
export async function isStaffAuthenticated(): Promise<boolean> {
  const session = await getStaffSession();
  return session?.role === "owner";
}

export async function isManagementAuthenticated(): Promise<boolean> {
  const session = await getStaffSession();
  return session?.role === "management";
}

export async function isReceptionAuthenticated(): Promise<boolean> {
  const session = await getStaffSession();
  return session?.role === "reception";
}

export function staffCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
