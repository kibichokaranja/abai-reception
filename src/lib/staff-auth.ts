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

export function itManagerPasswordConfigured(): boolean {
  return Boolean(
    process.env.IT_MANAGER_PASSWORD &&
      process.env.IT_MANAGER_PASSWORD.length > 0,
  );
}

export function websiteApiKeyConfigured(): boolean {
  return Boolean(
    process.env.WEBSITE_API_KEY && process.env.WEBSITE_API_KEY.length > 0,
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

export function verifyItManagerPassword(password: string): boolean {
  const expected = process.env.IT_MANAGER_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

/** Constant-time-ish compare for website API key header / Bearer token. */
export function verifyWebsiteApiKey(provided: string | null | undefined): boolean {
  const expected = process.env.WEBSITE_API_KEY;
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export function websiteApiKeyFromRequest(request: Request): string | null {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
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
  // website_api has no portal login; use WEBSITE_API_KEY on /api/website/*.
  if (options.role === "website_api") {
    return {
      ok: false,
      error:
        "Website API uses WEBSITE_API_KEY on /api/website/reviews — not a portal login.",
      status: 400,
    };
  }

  const envOk =
    options.role === "owner"
      ? staffPasswordConfigured() && verifyStaffPassword(password)
      : options.role === "management"
        ? managementPasswordConfigured() && verifyManagementPassword(password)
        : options.role === "it_manager"
          ? itManagerPasswordConfigured() && verifyItManagerPassword(password)
          : receptionPasswordConfigured() && verifyReceptionPassword(password);

  if (!envOk) {
    const missing =
      options.role === "owner"
        ? !staffPasswordConfigured()
        : options.role === "management"
          ? !managementPasswordConfigured()
          : options.role === "it_manager"
            ? !itManagerPasswordConfigured()
            : !receptionPasswordConfigured();
    if (missing) {
      const varName =
        options.role === "owner"
          ? "STAFF_PASSWORD"
          : options.role === "management"
            ? "MANAGEMENT_PASSWORD"
            : options.role === "it_manager"
              ? "IT_MANAGER_PASSWORD"
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
  if (raw === "it_manager") return "it_manager";
  if (raw === "website_api") return "website_api";
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

export async function isItManagerAuthenticated(): Promise<boolean> {
  const session = await getStaffSession();
  return session?.role === "it_manager";
}

/** Owner always fully entitled — never Unauthorized on owner-gated actions. */
export function isOwnerRole(role: string | null | undefined): boolean {
  return role === "owner";
}

/**
 * Approve into live system: owner + IT manager always.
 * Management only when owner grants can_approve_feedback.
 */
export function canApproveFeedback(
  role: string | null | undefined,
  options?: { canApproveFeedback?: boolean },
): boolean {
  if (role === "owner" || role === "it_manager") return true;
  if (role === "management" && options?.canApproveFeedback) return true;
  return false;
}

/** Owner, IT, and management may view the pending queue (approve still gated). */
export function canViewPending(role: string | null | undefined): boolean {
  return (
    role === "owner" || role === "management" || role === "it_manager"
  );
}

/** Mark irrelevant: IT manager and admin/owner only. */
export function canMarkIrrelevant(role: string | null | undefined): boolean {
  return role === "owner" || role === "it_manager";
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
