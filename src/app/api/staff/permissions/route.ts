import { NextResponse } from "next/server";
import {
  listDashboardPermissions,
  upsertDashboardPermissions,
  type DashboardPermissionKey,
  type DashboardRole,
  DASHBOARD_PERMISSION_FIELDS,
} from "@/lib/dashboard-permissions";
import { getStaffSessionFromRequest } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLE_SET = new Set<DashboardRole>(["management", "reception"]);
const KEY_SET = new Set(DASHBOARD_PERMISSION_FIELDS.map((f) => f.key));

function isDashboardRole(value: unknown): value is DashboardRole {
  return typeof value === "string" && ROLE_SET.has(value as DashboardRole);
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
    const permissions = await listDashboardPermissions();
    return NextResponse.json(
      {
        permissions,
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

  let role: DashboardRole | null = null;
  const patch: Partial<Record<DashboardPermissionKey, boolean>> = {};

  try {
    const body = (await request.json()) as {
      role?: string;
      permissions?: Record<string, unknown>;
    };
    role = isDashboardRole(body.role) ? body.role : null;
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

  if (!role) {
    return NextResponse.json(
      { error: "role must be management or reception" },
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
    // Reception never gets the question carousel or approve right — ignore/force off.
    if (role === "reception") {
      patch.show_question_carousel = false;
      patch.can_approve_feedback = false;
    }
    const saved = await upsertDashboardPermissions(role, patch);
    return NextResponse.json(
      { ok: true, permissions: saved },
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
