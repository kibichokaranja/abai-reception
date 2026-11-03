import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const STAFF_COOKIE = "abai_staff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

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

export function verifyStaffPassword(password: string): boolean {
  const expected = process.env.STAFF_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function createStaffSessionToken(): Promise<string> {
  return new SignJWT({ role: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function isValidStaffToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "staff";
  } catch {
    return false;
  }
}

export async function isStaffAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  return isValidStaffToken(token);
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
