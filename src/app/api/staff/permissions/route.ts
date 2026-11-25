import { NextResponse } from "next/server";
import {
  DASHBOARD_PERMISSION_FIELDS,
  listDashboardPermissions,
  listStaffUsersWithPermissions,
  upsertUserDashboardPermissions,
  type DashboardPermissionKey,
  type DashboardRole,
} from "@/lib/dashboard-permissions";
import { getStaffSessionFromRequest } from "@/lib/staff-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { StaffUserRole } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KEY_SET = new Set(DASHBOARD_PERMISSION_FIELDS.map((f) => f.key));

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
  if (!session || session.role !== "owner") return null;
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
    const [users, roleDefaults] = await Promise.all([
      listStaffUsersWithPermissions(),
      listDashboardPermissions(),
    ]);
    return NextResponse.json(
      {
        users,
        /** Role-slot defaults kept for env-bootstrap / seeding reference. */
        roleDefaults,
        fields: DASHBOARD_PERMISSION_FIELDS,
      },
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

export async function PUT(request: Request) {
  const session = await requireOwner(request);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  let staffUserId: string | null = null;
  const patch: Partial<Record<DashboardPermissionKey, boolean>> = {};

  try {
    const body = (await request.json()) as {
      staffUserId?: string;
      /** @deprecated role-slot saves — prefer staffUserId */
      role?: string;
      permissions?: Record<string, unknown>;
    };
    staffUserId =
      typeof body.staffUserId === "string" && body.staffUserId.length > 0
        ? body.staffUserId
        : null;
    if (body.permissions && typeof body.permissions === "object") {
      for (const [key, value] of Object.entries(body.permissions)) {
        if (
          KEY_SET.has(key as DashboardPermissionKey) &&
          typeof value === "boolean"
        ) {
          patch[key as DashboardPermissionKey] = value;
        }
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (!staffUserId) {
    return NextResponse.json(
      { error: "staffUserId is required" },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No valid permission flags provided" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: user, error } = await supabase
      .from("staff_users")
      .select("id, role")
      .eq("id", staffUserId)
      .maybeSingle();
    if (error) {
      throw new Error(`Could not look up user: ${error.message}`);
    }
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: noStoreHeaders() },
      );
    }
    const role = user.role as StaffUserRole;
    if (role !== "management" && role !== "reception") {
      return NextResponse.json(
        {
          error:
            "Dashboard visibility is only editable for Management and Staff desk users",
        },
        { status: 400, headers: noStoreHeaders() },
      );
    }
    const dashboardRole = role as DashboardRole;
    // Reception never gets the question carousel or approve right — ignore/force off.
    if (dashboardRole === "reception") {
      patch.show_question_carousel = false;
      patch.can_approve_feedback = false;
    }
    const saved = await upsertUserDashboardPermissions(
      staffUserId,
      dashboardRole,
      patch,
    );
    return NextResponse.json(
      { ok: true, permissions: saved, staffUserId },
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
