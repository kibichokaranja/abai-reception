"use client";

import { useCallback, useEffect, useState } from "react";
import {
  permissionFieldsForRole,
  type DashboardPermissionKey,
  type DashboardPermissions,
  type DashboardRole,
} from "@/lib/dashboard-permissions";

const ROLES: { value: DashboardRole; label: string }[] = [
  { value: "management", label: "Management" },
  { value: "reception", label: "Staff desk" },
];

export function OwnerPermissionsEditor() {
  const [byRole, setByRole] = useState<Record<DashboardRole, DashboardPermissions> | null>(
    null,
  );
  const [activeRole, setActiveRole] = useState<DashboardRole>("management");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/permissions", {
        credentials: "include",
      });
      const data = (await res.json()) as {
        permissions?: DashboardPermissions[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not load permissions");
      }
      const map = {
        management: data.permissions?.find((p) => p.role === "management"),
        reception: data.permissions?.find((p) => p.role === "reception"),
      };
      if (!map.management || !map.reception) {
        throw new Error("Permissions incomplete — run 20260332 migration");
      }
      setByRole({
        management: map.management,
        reception: map.reception,
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

  function toggle(key: DashboardPermissionKey) {
    setByRole((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [activeRole]: {
          ...prev[activeRole],
          [key]: !prev[activeRole][key],
        },
      };
    });
    setMessage(null);
  }

  async function save() {
    if (!byRole) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const current = byRole[activeRole];
      const permissions = Object.fromEntries(
        permissionFieldsForRole(activeRole).map((f) => [
          f.key,
          current[f.key],
        ]),
      );
      // Reception never gets the question carousel.
      if (activeRole === "reception") {
        permissions.show_question_carousel = false;
      }
      const res = await fetch("/api/staff/permissions", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: activeRole, permissions }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        permissions?: DashboardPermissions;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not save permissions");
      }
      // Always reload from server so refresh/persistence matches what was saved.
      const res2 = await fetch("/api/staff/permissions", {
        credentials: "include",
        cache: "no-store",
      });
      const data2 = (await res2.json()) as {
        permissions?: DashboardPermissions[];
        error?: string;
      };
      if (!res2.ok) {
        throw new Error(data2.error || "Saved but could not reload permissions");
      }
      const map = {
        management: data2.permissions?.find((p) => p.role === "management"),
        reception: data2.permissions?.find((p) => p.role === "reception"),
      };
      if (!map.management || !map.reception) {
        throw new Error("Permissions incomplete after save — run 20260332 migration");
      }
      setByRole({
        management: map.management,
        reception: map.reception,
      });
      const roleLabel =
        activeRole === "reception" ? "Staff desk" : "Management";
      setMessage(`Saved ${roleLabel} dashboard visibility.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const current = byRole?.[activeRole];

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
          Owner-only. Choose what management and staff desk see on their
          dashboards. Changes persist across refresh.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => {
              setActiveRole(r.value);
              setMessage(null);
            }}
            className={`min-h-10 rounded-lg px-4 text-sm font-medium ${
              activeRole === r.value
                ? "bg-abai-navy text-white"
                : "border border-abai-navy/20 text-abai-navy hover:bg-abai-navy/5"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading || !current ? (
        <p className="text-sm text-abai-muted">Loading permissions…</p>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {permissionFieldsForRole(activeRole).map((field) => (
              <li key={field.key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-abai-navy/10 px-3 py-3 hover:bg-abai-navy/[0.02]">
                  <input
                    type="checkbox"
                    checked={Boolean(current[field.key])}
                    onChange={() => toggle(field.key)}
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
          {activeRole === "reception" ? (
            <p className="text-xs text-abai-muted">
              Question carousel is available on owner and management only — it
              cannot be enabled for staff desk.
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving || loading || !current}
          onClick={() => void save()}
          className="min-h-10 rounded-lg bg-abai-gold px-4 text-sm font-semibold text-abai-navy disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save visibility"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
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
