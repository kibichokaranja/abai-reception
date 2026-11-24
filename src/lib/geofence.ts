/**
 * Server-side geofence (option B): IP / network allowlist.
 *
 * Guests are never asked for browser geolocation. The submit API checks the
 * request IP (or X-Forwarded-For) against ABAI_GEOFENCE_ALLOWLIST.
 *
 * Legacy ABAI_GEOFENCE_LAT / ABAI_GEOFENCE_LNG / ABAI_GEOFENCE_RADIUS_M are
 * ignored — keep them unset or remove from Vercel after deploy.
 *
 * Limits: IPs can be spoofed only if the edge trusts forged X-Forwarded-For;
 * on Vercel the platform sets the real client IP. A web app cannot fully block
 * photographing a printed or on-screen form — use allowlist + IT approval.
 */

export const OFFSITE_SUBMIT_ERROR =
  "Unable to submit from this location. Please use the form at Abai Lodges & Spa.";

/** Comma/space/newline-separated IPv4 addresses or CIDRs, or `*` to allow all. */
export function getGeofenceAllowlist(): string[] {
  const raw = process.env.ABAI_GEOFENCE_ALLOWLIST ?? "";
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function matchCidr(ip: string, entry: string): boolean {
  if (entry === "*") return true;
  if (entry.includes("/")) {
    const [base, bitsRaw] = entry.split("/");
    const bits = Number(bitsRaw);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const ipInt = ipv4ToInt(ip);
    const baseInt = ipv4ToInt(base);
    if (ipInt == null || baseInt == null) return false;
    if (bits === 0) return true;
    const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
  }
  return ip === entry;
}

export function isIpAllowed(
  ip: string | null | undefined,
  allowlist: string[] = getGeofenceAllowlist(),
): boolean {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, "").trim();
  if (!normalized) return false;
  if (allowlist.length === 0) {
    // Local/dev convenience when allowlist is not configured yet.
    if (process.env.NODE_ENV !== "production") {
      return (
        normalized === "127.0.0.1" ||
        normalized === "::1" ||
        normalized === "localhost"
      );
    }
    return false;
  }
  if (allowlist.includes("*")) return true;
  return allowlist.some((entry) => matchCidr(normalized, entry));
}

/**
 * Prefer platform / proxy client IP headers. First X-Forwarded-For hop is the client.
 */
export function clientIpFromRequest(request: Request): string | null {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null;
}

export type NetworkGeofenceCheck =
  | { ok: true; ip: string }
  | { ok: false; error: string; ip: string | null };

/** Fail-closed: missing IP or IP outside allowlist → exact off-site message. */
export function validateSubmitNetwork(
  request: Request,
): NetworkGeofenceCheck {
  const ip = clientIpFromRequest(request);
  if (!isIpAllowed(ip)) {
    return { ok: false, error: OFFSITE_SUBMIT_ERROR, ip };
  }
  return { ok: true, ip: ip! };
}
