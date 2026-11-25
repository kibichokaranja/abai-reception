import { NextResponse } from "next/server";
import {
  authenticatePortalLogin,
  createStaffSessionToken,
  staffCookieOptions,
  STAFF_COOKIE,
} from "@/lib/staff-auth";

export async function POST(request: Request) {
  let password = "";
  let username = "";
  try {
    const body = (await request.json()) as {
      password?: string;
      username?: string;
    };
    password = typeof body.password === "string" ? body.password : "";
    username = typeof body.username === "string" ? body.username : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const auth = await authenticatePortalLogin({
    role: "owner",
    username,
    password,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const token = await createStaffSessionToken("owner", auth.userId);
    const response = NextResponse.json({ ok: true, role: "owner" });
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
