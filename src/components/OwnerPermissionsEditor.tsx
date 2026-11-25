"use client";

import { useCallback, useEffect, useState } from "react";
import {
  permissionFieldsForRole,
  type DashboardPermissionKey,
  type DashboardPermissions,
  type DashboardRole,
  type StaffUserPermissionRow,
} from "@/lib/dashboard-permissions";
import { STAFF_USERS_CHANGED_EVENT } from "@/lib/staff-users-events";
import { STAFF_USER_ROLES } from "@/lib/types";

export function OwnerPermissionsEditor() {
  const [users, setUsers] = useState<StaffUserPermissionRow[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DashboardPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (preferUserId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/permissions", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = (await res.json()) as {
        users?: StaffUserPermissionRow[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not load permissions");
      }
      const list = data.users ?? [];
      setUsers(list);
      setActiveUserId((prev) => {
        const want = preferUserId ?? prev;
        if (want && list.some((u) => u.id === want)) return want;
        const firstEditable = list.find((u) => u.editable);
        return firstEditable?.id ?? list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onUsersChanged() {
      void load();
    }
    window.addEventListener(STAFF_USERS_CHANGED_EVENT, onUsersChanged);
    return () => {
      window.removeEventListener(STAFF_USERS_CHANGED_EVENT, onUsersChanged);
    };
  }, [load]);

  const activeUser = users.find((u) => u.id === activeUserId) ?? null;

  useEffect(() => {
    if (!activeUser) {
      setDraft(null);
      return;
    }
    setDraft({ ...activeUser.permissions });
  }, [activeUser]);

  function toggle(key: DashboardPermissionKey) {
    if (!activeUser?.editable || !draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: !prev[key] };
    });
    setMessage(null);
  }

  async function save() {
    if (!activeUser?.editable || !draft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const role = activeUser.role as DashboardRole;
      const permissions = Object.fromEntries(
        permissionFieldsForRole(role).map((f) => [f.key, draft[f.key]]),
      );
      if (role === "reception") {
        permissions.show_question_carousel = false;
        permissions.can_approve_feedback = false;
      }
      const res = await fetch("/api/staff/permissions", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffUserId: activeUser.id,
          permissions,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        permissions?: DashboardPermissions;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not save permissions");
      }
      await load(activeUser.id);
      const label =
        activeUser.display_name?.trim() || activeUser.username;
      setMessage(`Saved dashboard visibility for ${label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const editableRole =
    activeUser?.role === "management" || activeUser?.role === "reception"
      ? (activeUser.role as DashboardRole)
      : null;

  return (
    <section
      aria-label="Dashboard visibility"
      className="space-y-4 rounded-xl border border-abai-navy/10 bg-white p-4"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-abai-navy">
          Dashboard visibility
        </h2>
        <p className="mt-1 text-sm text-abai-muted">
          Owner-only. Assign rights per created staff user (not only generic
          Management / Staff desk slots). New users appear here immediately
          after create. Owner and IT manager rights stay fixed; Website API has
          no dashboard.
        </p>
      </div>

      {loading && users.length === 0 ? (
        <p className="text-sm text-abai-muted">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-abai-muted">
          No staff users yet. Create one under Staff users above — it will show
          here right away so you can assign rights.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const label = u.display_name?.trim() || u.username;
              const roleLabel =
                STAFF_USER_ROLES.find((r) => r.value === u.role)?.label ??
                u.role;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setActiveUserId(u.id);
                    setMessage(null);
                  }}
                  className={`min-h-10 max-w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium ${
                    activeUserId === u.id
                      ? "bg-abai-navy text-white"
                      : "border border-abai-navy/20 text-abai-navy hover:bg-abai-navy/5"
                  }`}
                >
                  <span className="block truncate">{label}</span>
                  <span
                    className={`block text-xs font-normal ${
                      activeUserId === u.id
                        ? "text-white/80"
                        : "text-abai-muted"
                    }`}
                  >
                    {roleLabel}
                    {!u.active ? " · inactive" : ""}
                    {!u.editable ? " · fixed" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {activeUser && draft ? (
            <div className="space-y-3">
              {activeUser.lockedNote ? (
                <p className="rounded-lg border border-abai-navy/10 bg-abai-navy/[0.03] px-3 py-2 text-sm text-abai-muted">
                  {activeUser.lockedNote}
                </p>
              ) : null}

              {editableRole ? (
                <>
                  <ul className="space-y-2">
                    {permissionFieldsForRole(editableRole).map((field) => (
                      <li key={field.key}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-abai-navy/10 px-3 py-3 hover:bg-abai-navy/[0.02]">
                          <input
                            type="checkbox"
                            checked={Boolean(draft[field.key])}
                            onChange={() => toggle(field.key)}
                            disabled={!activeUser.editable}
                            className="mt-1 size-4 accent-abai-gold"
                          />
                          <span>
                            <span className="block text-sm font-medium text-abai-navy">
                              {field.label}
                            </span>
                            <span className="block text-xs text-abai-muted">
                              {field.hint}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {editableRole === "reception" ? (
                    <p className="text-xs text-abai-muted">
                      Question carousel and approve-pending cannot be enabled
                      for staff desk users.
                    </p>
                  ) : (
                    <p className="text-xs text-abai-muted">
                      “Approve pending reviews” lets this management user
                      approve or reject into the live system. IT manager and
                      owner always can.
                    </p>
                  )}
                </>
              ) : (
                <ul className="space-y-1 text-sm text-abai-muted">
                  {Object.entries({
                    Analytics: draft.show_analytics,
                    "Category averages": draft.show_category_averages,
                    Carousel: draft.show_question_carousel,
                    "Review rows": draft.show_feedback_list,
                    Comments: draft.show_comments,
                    "Guest details": draft.show_guest_details,
                    "Date filters": draft.show_date_filters,
                    "Low-score filter": draft.show_low_score_filter,
                    Export: draft.show_export,
                    Approve: draft.can_approve_feedback,
                  }).map(([label, on]) => (
                    <li key={label}>
                      {on ? "✓" : "–"} {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={
            saving || loading || !activeUser?.editable || !draft
          }
          onClick={() => void save()}
          className="min-h-10 rounded-lg bg-abai-gold px-4 text-sm font-semibold text-abai-navy disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save visibility"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(activeUserId)}
          className="min-h-10 rounded-lg border border-abai-navy/20 px-4 text-sm font-medium text-abai-navy"
        >
          Reload
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-abai-navy" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
