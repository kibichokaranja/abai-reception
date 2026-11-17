import { NextResponse } from "next/server";
import {
  getStaffSession,
  hashStaffPassword,
} from "@/lib/staff-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { STAFF_USER_ROLES, type StaffUserRole } from "@/lib/types";

const ROLE_SET = new Set(STAFF_USER_ROLES.map((r) => r.value));

function isStaffUserRole(value: unknown): value is StaffUserRole {
  return typeof value === "string" && ROLE_SET.has(value as StaffUserRole);
}

export async function GET() {
  const session = await getStaffSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_users")
      .select("id, username, role, active, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("staff_users list failed", error);
      return NextResponse.json(
        {
          error: `Could not list users: ${error.message}. Run supabase/migrations/20260330_staff_users.sql if needed.`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let username = "";
  let password = "";
  let role: StaffUserRole | null = null;

  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      role?: string;
    };
    username = typeof body.username === "string" ? body.username.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
    role = isStaffUserRole(body.role) ? body.role : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (username.length < 2 || username.length > 64) {
    return NextResponse.json(
      { error: "Username must be 2–64 characters" },
      { status: 400 },
    );
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return NextResponse.json(
      {
        error:
          "Username may only contain letters, numbers, dots, underscores, and hyphens",
      },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }
  if (!role) {
    return NextResponse.json(
      { error: "Role must be owner, management, or reception" },
      { status: 400 },
    );
  }

  try {
    const password_hash = await hashStaffPassword(password);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_users")
      .insert({
        username,
        password_hash,
        role,
        active: true,
      })
      .select("id, username, role, active, created_at")
      .single();

    if (error) {
      console.error("staff_users insert failed", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: `Could not create user: ${error.message}. Run supabase/migrations/20260330_staff_users.sql if needed.`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
