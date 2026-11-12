import { NextResponse } from "next/server";
import {
  createStaffSessionToken,
  receptionPasswordConfigured,
  staffCookieOptions,
  STAFF_COOKIE,
  verifyReceptionPassword,
} from "@/lib/staff-auth";

export async function POST(request: Request) {
  if (!receptionPasswordConfigured()) {
    return NextResponse.json(
      { error: "RECEPTION_PASSWORD is not configured on the server." },
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

  if (!verifyReceptionPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  try {
    const token = await createStaffSessionToken("reception");
    const response = NextResponse.json({ ok: true, role: "reception" });
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
