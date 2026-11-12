import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const STAFF_COOKIE = "abai_staff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type StaffRole = "owner" | "reception";

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
  if (raw === "reception") return "reception";
  return null;
}

export async function getStaffSession(): Promise<{ role: StaffRole } | null> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
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

/** Owner (/staff) session — legacy name kept for existing call sites. */
export async function isStaffAuthenticated(): Promise<boolean> {
  const session = await getStaffSession();
  return session?.role === "owner";
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
