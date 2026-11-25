import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { StaffUserRole } from "@/lib/types";

export type DashboardRole = Extract<StaffUserRole, "management" | "reception">;

export type DashboardPermissions = {
  role: DashboardRole;
  show_analytics: boolean;
  show_category_averages: boolean;
  show_question_carousel: boolean;
  show_feedback_list: boolean;
  show_comments: boolean;
  show_guest_details: boolean;
  show_date_filters: boolean;
  show_low_score_filter: boolean;
  show_export: boolean;
  /** Management may approve/reject pending reviews when owner grants this. */
  can_approve_feedback: boolean;
  updated_at?: string;
};

export const DASHBOARD_PERMISSION_FIELDS = [
  {
    key: "show_analytics" as const,
    label: "At-a-glance analytics",
    hint: "Response counts, overall averages, value mix",
  },
  {
    key: "show_category_averages" as const,
    label: "Category averages",
    hint: "Average score per question category",
  },
  {
    key: "show_question_carousel" as const,
    label: "Question carousel",
    hint: "Slide through survey questions (owner + management only; never on staff desk)",
    roles: ["management"] as const,
  },
  {
    key: "can_approve_feedback" as const,
    label: "Approve pending reviews",
    hint: "Approve or reject guest feedback before it enters the live/approved system (IT manager always can)",
    roles: ["management"] as const,
  },
  {
    key: "show_feedback_list" as const,
    label: "Customer review rows",
    hint: "Individual guest feedback table (approved only)",
  },
  {
    key: "show_comments" as const,
    label: "Comments column",
    hint: "Guest free-text comments (requires review rows)",
  },
  {
    key: "show_guest_details" as const,
    label: "Guest details",
    hint: "Name / phone / room columns (requires review rows)",
  },
  {
    key: "show_date_filters" as const,
    label: "Date filters",
    hint: "Visit from / to date controls",
  },
  {
    key: "show_low_score_filter" as const,
    label: "Low-score filter",
    hint: "Filter responses with scores ≤ 2.5",
  },
  {
    key: "show_export" as const,
    label: "Export Excel / PDF",
    hint: "Download filtered feedback",
  },
];

export type DashboardPermissionKey =
  (typeof DASHBOARD_PERMISSION_FIELDS)[number]["key"];

const MANAGEMENT_DEFAULTS: DashboardPermissions = {
  role: "management",
  show_analytics: true,
  show_category_averages: true,
  show_question_carousel: true,
  show_feedback_list: true,
  show_comments: true,
  show_guest_details: true,
  show_date_filters: true,
  show_low_score_filter: true,
  show_export: false,
  can_approve_feedback: false,
};

const RECEPTION_DEFAULTS: DashboardPermissions = {
  role: "reception",
  show_analytics: false,
  show_category_averages: true,
  // Carousel is owner + management only — never reception.
  show_question_carousel: false,
  show_feedback_list: false,
  show_comments: false,
  show_guest_details: false,
  show_date_filters: true,
  show_low_score_filter: false,
  show_export: false,
  // Staff desk never approves into the live system.
  can_approve_feedback: false,
};

/** Permission fields editable for a dashboard role in the owner UI. */
export function permissionFieldsForRole(role: DashboardRole) {
  return DASHBOARD_PERMISSION_FIELDS.filter((field) => {
    if (!("roles" in field) || !field.roles) return true;
    return (field.roles as readonly DashboardRole[]).includes(role);
  });
}

export function defaultPermissionsForRole(
  role: DashboardRole,
): DashboardPermissions {
  return role === "management"
    ? { ...MANAGEMENT_DEFAULTS }
    : { ...RECEPTION_DEFAULTS };
}

function normalizeRow(
  role: DashboardRole,
  row: Partial<DashboardPermissions> | null | undefined,
): DashboardPermissions {
  const defaults = defaultPermissionsForRole(role);
  if (!row) return defaults;
  return {
    role,
    show_analytics: Boolean(row.show_analytics ?? defaults.show_analytics),
    show_category_averages: Boolean(
      row.show_category_averages ?? defaults.show_category_averages,
    ),
    // Reception never gets the question carousel, even if DB still has true.
    show_question_carousel:
      role === "reception"
        ? false
        : Boolean(row.show_question_carousel ?? defaults.show_question_carousel),
    show_feedback_list: Boolean(
      row.show_feedback_list ?? defaults.show_feedback_list,
    ),
    show_comments: Boolean(row.show_comments ?? defaults.show_comments),
    show_guest_details: Boolean(
      row.show_guest_details ?? defaults.show_guest_details,
    ),
    show_date_filters: Boolean(
      row.show_date_filters ?? defaults.show_date_filters,
    ),
    show_low_score_filter: Boolean(
      row.show_low_score_filter ?? defaults.show_low_score_filter,
    ),
    show_export: Boolean(row.show_export ?? defaults.show_export),
    // Staff desk never approves, even if DB still has true.
    can_approve_feedback:
      role === "reception"
        ? false
        : Boolean(row.can_approve_feedback ?? defaults.can_approve_feedback),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

async function selectPermissionsRow(
  role: DashboardRole,
): Promise<Partial<DashboardPermissions> | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dashboard_permissions")
    .select(
      "role, show_analytics, show_category_averages, show_question_carousel, show_feedback_list, show_comments, show_guest_details, show_date_filters, show_low_score_filter, show_export, can_approve_feedback, updated_at",
    )
    .eq("role", role)
    .maybeSingle();
  if (error) {
    console.error("dashboard_permissions select failed", error);
    if (/can_approve_feedback/i.test(error.message ?? "")) {
      // Column missing: fall back without the new flag until migration runs.
      const fallback = await supabase
        .from("dashboard_permissions")
        .select(
          "role, show_analytics, show_category_averages, show_question_carousel, show_feedback_list, show_comments, show_guest_details, show_date_filters, show_low_score_filter, show_export, updated_at",
        )
        .eq("role", role)
        .maybeSingle();
      if (fallback.error) {
        console.error("dashboard_permissions fallback select failed", fallback.error);
        return null;
      }
      return {
        ...(fallback.data as Partial<DashboardPermissions> | null),
        can_approve_feedback: false,
      };
    }
    if (/does not exist/i.test(error.message ?? "")) {
      throw new Error(
        `dashboard_permissions unavailable: ${error.message}. Run supabase/migrations/20260332_dashboard_permissions.sql.`,
      );
    }
    return null;
  }
  return (data as Partial<DashboardPermissions> | null) ?? null;
}

export async function getDashboardPermissions(
  role: DashboardRole,
): Promise<DashboardPermissions> {
  try {
    const data = await selectPermissionsRow(role);
    if (!data) {
      // Seed a row so owner saves and role dashboards stay consistent after refresh.
      const defaults = defaultPermissionsForRole(role);
      try {
        return await upsertDashboardPermissions(role, defaults);
      } catch (seedErr) {
        console.error("dashboard_permissions seed failed", seedErr);
        return defaults;
      }
    }
    return normalizeRow(role, data);
  } catch (err) {
    if (
      err instanceof Error &&
      /dashboard_permissions unavailable/i.test(err.message)
    ) {
      throw err;
    }
    console.error("dashboard_permissions unavailable", err);
    return defaultPermissionsForRole(role);
  }
}

export async function listDashboardPermissions(): Promise<
  DashboardPermissions[]
> {
  const [management, reception] = await Promise.all([
    getDashboardPermissions("management"),
    getDashboardPermissions("reception"),
  ]);
  return [management, reception];
}

export async function upsertDashboardPermissions(
  role: DashboardRole,
  patch: Partial<Omit<DashboardPermissions, "role" | "updated_at">>,
): Promise<DashboardPermissions> {
  let current: DashboardPermissions;
  try {
    const existing = await selectPermissionsRow(role);
    current = normalizeRow(role, existing);
  } catch {
    current = defaultPermissionsForRole(role);
  }
  const next: DashboardPermissions = {
    ...current,
    ...patch,
    role,
    // Hard rule: staff desk dashboards never include the question carousel.
    show_question_carousel:
      role === "reception"
        ? false
        : Boolean(
            patch.show_question_carousel ?? current.show_question_carousel,
          ),
    can_approve_feedback:
      role === "reception"
        ? false
        : Boolean(patch.can_approve_feedback ?? current.can_approve_feedback),
  };
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dashboard_permissions")
    .upsert(
      {
        role,
        show_analytics: next.show_analytics,
        show_category_averages: next.show_category_averages,
        show_question_carousel: next.show_question_carousel,
        show_feedback_list: next.show_feedback_list,
        show_comments: next.show_comments,
        show_guest_details: next.show_guest_details,
        show_date_filters: next.show_date_filters,
        show_low_score_filter: next.show_low_score_filter,
        show_export: next.show_export,
        can_approve_feedback: next.can_approve_feedback,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role" },
    )
    .select(
      "role, show_analytics, show_category_averages, show_question_carousel, show_feedback_list, show_comments, show_guest_details, show_date_filters, show_low_score_filter, show_export, can_approve_feedback, updated_at",
    )
    .single();

  if (error) {
    const migrateHint = /can_approve_feedback/i.test(error.message ?? "")
      ? " Run supabase/migrations/20260340_dashboard_permissions_approve.sql."
      : " Run supabase/migrations/20260332_dashboard_permissions.sql if needed.";
    throw new Error(
      `Could not save permissions: ${error.message}.${migrateHint}`,
    );
  }

  return normalizeRow(role, data as Partial<DashboardPermissions>);
}

/** Owner always has full access; other roles use persisted flags. */
export async function resolveEffectivePermissions(
  role: StaffUserRole,
  userId?: string,
): Promise<DashboardPermissions | "owner-full"> {
  if (role === "owner") return "owner-full";
  if (role === "it_manager") {
    return {
      role: "management",
      show_analytics: true,
      show_category_averages: true,
      show_question_carousel: true,
      show_feedback_list: true,
      show_comments: true,
      show_guest_details: true,
      show_date_filters: true,
      show_low_score_filter: true,
      show_export: false,
      can_approve_feedback: true,
    };
  }
  if (role === "website_api") {
    return defaultPermissionsForRole("reception");
  }
  if (userId && (role === "management" || role === "reception")) {
    return getUserDashboardPermissions(userId, role);
  }
  return getDashboardPermissions(role);
}

const USER_PERM_SELECT =
  "staff_user_id, show_analytics, show_category_averages, show_question_carousel, show_feedback_list, show_comments, show_guest_details, show_date_filters, show_low_score_filter, show_export, can_approve_feedback, updated_at";

export type StaffUserPermissionRow = {
  id: string;
  display_name: string | null;
  username: string;
  role: StaffUserRole;
  active: boolean;
  created_at: string;
  /** Editable only for management / reception. */
  editable: boolean;
  /** Fixed rights note for owner / IT / website_api. */
  lockedNote?: string;
  permissions: DashboardPermissions;
};

function lockedNoteForRole(role: StaffUserRole): string | undefined {
  if (role === "owner") {
    return "Owner always has full dashboard access — not editable per user.";
  }
  if (role === "it_manager") {
    return "IT manager has fixed rights (including approve; no export) — not editable per user.";
  }
  if (role === "website_api") {
    return "Website API has no dashboard — rights are not assigned here.";
  }
  return undefined;
}

async function selectUserPermissionsRow(
  staffUserId: string,
): Promise<Partial<DashboardPermissions> | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dashboard_user_permissions")
    .select(USER_PERM_SELECT)
    .eq("staff_user_id", staffUserId)
    .maybeSingle();
  if (error) {
    console.error("dashboard_user_permissions select failed", error);
    if (/does not exist/i.test(error.message ?? "")) {
      throw new Error(
        `dashboard_user_permissions unavailable: ${error.message}. Run supabase/migrations/20260341_dashboard_user_permissions.sql.`,
      );
    }
    return null;
  }
  return (data as Partial<DashboardPermissions> | null) ?? null;
}

/** Effective permissions for one management/reception user (falls back to role defaults). */
export async function getUserDashboardPermissions(
  staffUserId: string,
  role: DashboardRole,
): Promise<DashboardPermissions> {
  try {
    const data = await selectUserPermissionsRow(staffUserId);
    if (!data) {
      const defaults = await getDashboardPermissions(role);
      try {
        return await upsertUserDashboardPermissions(staffUserId, role, defaults);
      } catch (seedErr) {
        console.error("dashboard_user_permissions seed failed", seedErr);
        return defaults;
      }
    }
    return normalizeRow(role, data);
  } catch (err) {
    if (
      err instanceof Error &&
      /dashboard_user_permissions unavailable/i.test(err.message)
    ) {
      // Table missing: fall back to role-slot so dashboards keep working until SQL runs.
      console.error(err);
      return getDashboardPermissions(role);
    }
    console.error("dashboard_user_permissions unavailable", err);
    return getDashboardPermissions(role);
  }
}

export async function upsertUserDashboardPermissions(
  staffUserId: string,
  role: DashboardRole,
  patch: Partial<Omit<DashboardPermissions, "role" | "updated_at">>,
): Promise<DashboardPermissions> {
  let current: DashboardPermissions;
  try {
    const existing = await selectUserPermissionsRow(staffUserId);
    current = existing
      ? normalizeRow(role, existing)
      : await getDashboardPermissions(role);
  } catch {
    current = defaultPermissionsForRole(role);
  }
  const next: DashboardPermissions = {
    ...current,
    ...patch,
    role,
    show_question_carousel:
      role === "reception"
        ? false
        : Boolean(
            patch.show_question_carousel ?? current.show_question_carousel,
          ),
    can_approve_feedback:
      role === "reception"
        ? false
        : Boolean(patch.can_approve_feedback ?? current.can_approve_feedback),
  };
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dashboard_user_permissions")
    .upsert(
      {
        staff_user_id: staffUserId,
        show_analytics: next.show_analytics,
        show_category_averages: next.show_category_averages,
        show_question_carousel: next.show_question_carousel,
        show_feedback_list: next.show_feedback_list,
        show_comments: next.show_comments,
        show_guest_details: next.show_guest_details,
        show_date_filters: next.show_date_filters,
        show_low_score_filter: next.show_low_score_filter,
        show_export: next.show_export,
        can_approve_feedback: next.can_approve_feedback,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "staff_user_id" },
    )
    .select(USER_PERM_SELECT)
    .single();

  if (error) {
    const migrateHint = /does not exist/i.test(error.message ?? "")
      ? " Run supabase/migrations/20260341_dashboard_user_permissions.sql."
      : "";
    throw new Error(
      `Could not save user permissions: ${error.message}.${migrateHint}`,
    );
  }

  return normalizeRow(role, data as Partial<DashboardPermissions>);
}

/** Seed per-user rights from role defaults when a management/reception user is created. */
export async function seedUserDashboardPermissions(
  staffUserId: string,
  role: StaffUserRole,
): Promise<void> {
  if (role !== "management" && role !== "reception") return;
  try {
    const defaults = await getDashboardPermissions(role);
    await upsertUserDashboardPermissions(staffUserId, role, defaults);
  } catch (err) {
    console.error("seedUserDashboardPermissions failed", err);
  }
}

/** List every staff user with effective / locked visibility for the owner UI. */
export async function listStaffUsersWithPermissions(): Promise<
  StaffUserPermissionRow[]
> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("id, display_name, username, role, active, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    throw new Error(
      `Could not list staff users: ${error.message}. Run supabase/migrations/20260330_staff_users.sql if needed.`,
    );
  }

  const users = (data ?? []) as Array<{
    id: string;
    display_name: string | null;
    username: string;
    role: StaffUserRole;
    active: boolean;
    created_at: string;
  }>;

  const rows: StaffUserPermissionRow[] = [];
  for (const user of users) {
    const editable = user.role === "management" || user.role === "reception";
    let permissions: DashboardPermissions;
    if (user.role === "owner") {
      permissions = {
        role: "management",
        show_analytics: true,
        show_category_averages: true,
        show_question_carousel: true,
        show_feedback_list: true,
        show_comments: true,
        show_guest_details: true,
        show_date_filters: true,
        show_low_score_filter: true,
        show_export: true,
        can_approve_feedback: true,
      };
    } else if (user.role === "it_manager") {
      permissions = {
        role: "management",
        show_analytics: true,
        show_category_averages: true,
        show_question_carousel: true,
        show_feedback_list: true,
        show_comments: true,
        show_guest_details: true,
        show_date_filters: true,
        show_low_score_filter: true,
        show_export: false,
        can_approve_feedback: true,
      };
    } else if (user.role === "website_api") {
      permissions = defaultPermissionsForRole("reception");
    } else {
      permissions = await getUserDashboardPermissions(
        user.id,
        user.role as DashboardRole,
      );
    }
    rows.push({
      id: user.id,
      display_name: user.display_name,
      username: user.username,
      role: user.role,
      active: user.active,
      created_at: user.created_at,
      editable,
      lockedNote: lockedNoteForRole(user.role),
      permissions,
    });
  }
  return rows;
}
