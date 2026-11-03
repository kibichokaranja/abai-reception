import { NextResponse } from "next/server";
import {
  createStaffSessionToken,
  staffCookieOptions,
  staffPasswordConfigured,
  STAFF_COOKIE,
  verifyStaffPassword,
} from "@/lib/staff-auth";

export async function POST(request: Request) {
  if (!staffPasswordConfigured()) {
    return NextResponse.json(
      { error: "STAFF_PASSWORD is not configured on the server." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!verifyStaffPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  try {
    const token = await createStaffSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(STAFF_COOKIE, token, staffCookieOptions());
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "STAFF_SESSION_SECRET is missing or too short." },
      { status: 503 },
    );
  }
}
