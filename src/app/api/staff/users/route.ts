import { NextResponse } from "next/server";
import {
  getStaffSessionFromRequest,
  hashStaffPassword,
} from "@/lib/staff-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { STAFF_USER_ROLES, type StaffUserRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_SET = new Set(STAFF_USER_ROLES.map((r) => r.value));

function isStaffUserRole(value: unknown): value is StaffUserRole {
  return typeof value === "string" && ROLE_SET.has(value as StaffUserRole);
}

function noStoreHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    ...extra,
  };
}

async function requireOwner(request: Request) {
  const session = await getStaffSessionFromRequest(request);
  if (!session || session.role !== "owner") {
    return null;
  }
  return session;
}

export async function GET(request: Request) {
  const session = await requireOwner(request);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_users")
      .select("id, display_name, username, role, active, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("staff_users list failed", error);
      return NextResponse.json(
        {
          error: `Could not list users: ${error.message}. Run supabase/migrations/20260330_staff_users.sql (and 20260331_staff_users_display_name.sql) if needed.`,
        },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      { users: data ?? [] },
      { headers: noStoreHeaders() },
    );
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

export async function POST(request: Request) {
  const session = await requireOwner(request);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  let displayName = "";
  let username = "";
  let password = "";
  let role: StaffUserRole | null = null;

  try {
    const body = (await request.json()) as {
      displayName?: string;
      name?: string;
      username?: string;
      password?: string;
      role?: string;
    };
    displayName =
      typeof body.displayName === "string"
        ? body.displayName.trim()
        : typeof body.name === "string"
          ? body.name.trim()
          : "";
    username = typeof body.username === "string" ? body.username.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
    role = isStaffUserRole(body.role) ? body.role : null;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (displayName.length < 2 || displayName.length > 120) {
    return NextResponse.json(
      { error: "Name must be 2–120 characters" },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  if (username.length < 2 || username.length > 64) {
    return NextResponse.json(
      { error: "Username must be 2–64 characters" },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return NextResponse.json(
      {
        error:
          "Username may only contain letters, numbers, dots, underscores, and hyphens",
      },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  if (!role) {
    return NextResponse.json(
      { error: "Role must be owner, management, or reception" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const password_hash = await hashStaffPassword(password);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("staff_users")
      .insert({
        display_name: displayName,
        username,
        password_hash,
        role,
        active: true,
      })
      .select("id, display_name, username, role, active, created_at")
      .single();

    if (error) {
      console.error("staff_users insert failed", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That username is already taken" },
          { status: 409, headers: noStoreHeaders() },
        );
      }
      if (/display_name/i.test(error.message ?? "")) {
        return NextResponse.json(
          {
            error: `Could not create user: ${error.message}. Run supabase/migrations/20260331_staff_users_display_name.sql.`,
          },
          { status: 500, headers: noStoreHeaders() },
        );
      }
      return NextResponse.json(
        {
          error: `Could not create user: ${error.message}. Run supabase/migrations/20260330_staff_users.sql if needed.`,
        },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      { ok: true, user: data },
      { headers: noStoreHeaders() },
    );
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
