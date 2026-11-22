/**
 * Abai Lodges & Spa geofence helpers.
 *
 * Defaults: Kagio / Kirinyaga County, Kenya (off Kagio–Kutus Road),
 * approx. -0.62515, 37.253069 — Travelmyth / public listings.
 * Override with ABAI_GEOFENCE_LAT, ABAI_GEOFENCE_LNG, ABAI_GEOFENCE_RADIUS_M.
 */

export type GeofenceConfig = {
  lat: number;
  lng: number;
  radiusM: number;
};

/** Documented default for Abai Lodges & Spa (Kagio, Kirinyaga). */
export const ABAI_GEOFENCE_DEFAULTS: GeofenceConfig = {
  lat: -0.62515,
  lng: 37.253069,
  /** Lodge grounds + parking buffer (~500 m). */
  radiusM: 500,
};

function parseNumber(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getGeofenceConfig(): GeofenceConfig {
  return {
    lat: parseNumber(process.env.ABAI_GEOFENCE_LAT, ABAI_GEOFENCE_DEFAULTS.lat),
    lng: parseNumber(process.env.ABAI_GEOFENCE_LNG, ABAI_GEOFENCE_DEFAULTS.lng),
    radiusM: parseNumber(
      process.env.ABAI_GEOFENCE_RADIUS_M,
      ABAI_GEOFENCE_DEFAULTS.radiusM,
    ),
  };
}

/** Haversine distance in metres. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isWithinGeofence(
  lat: number,
  lng: number,
  config: GeofenceConfig = getGeofenceConfig(),
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return distanceMeters(lat, lng, config.lat, config.lng) <= config.radiusM;
}

export type GeolocationCheck =
  | { ok: true; lat: number; lng: number; distanceM: number }
  | { ok: false; error: string };

/**
 * Fail-closed: missing/invalid coords are rejected.
 * Browser geolocation can be spoofed; true photo-of-form cannot be blocked in a browser.
 * Geofence + management approval are the operational controls.
 */
export function validateSubmitLocation(
  lat: unknown,
  lng: unknown,
): GeolocationCheck {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return {
      ok: false,
      error:
        "Location is required to submit. Allow location access while on the Abai Lodges & Spa grounds.",
    };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false,
      error: "Could not read a valid location. Try again on the lodge grounds.",
    };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: "Location coordinates are out of range." };
  }
  const config = getGeofenceConfig();
  const distanceM = distanceMeters(lat, lng, config.lat, config.lng);
  if (distanceM > config.radiusM) {
    return {
      ok: false,
      error:
        "You must be at Abai Lodges & Spa to submit feedback. Move closer to the lodge and try again.",
    };
  }
  return { ok: true, lat, lng, distanceM };
}
