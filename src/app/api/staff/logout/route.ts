import { NextResponse } from "next/server";
import { STAFF_COOKIE, staffCookieOptions } from "@/lib/staff-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_COOKIE, "", staffCookieOptions(0));
  return response;
}
