"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { notifyStaffUsersChanged } from "@/lib/staff-users-events";
import { STAFF_USER_ROLES, type StaffUserRole } from "@/lib/types";

type StaffUserRow = {
  id: string;
  display_name?: string | null;
  username: string;
  role: StaffUserRole;
  active: boolean;
  created_at: string;
};

export function StaffCreateUser() {
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffUserRole>("reception");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<StaffUserRole>("reception");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/users", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = (await res.json()) as {
        users?: StaffUserRow[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not load users");
      }
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          password,
          role,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: StaffUserRow;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not create user");
      }
      // Show the new user immediately (before reload) so rights/visibility UIs
      // never look empty after a successful create.
      if (data.user) {
        setUsers((prev) => {
          if (prev.some((u) => u.id === data.user!.id)) return prev;
          return [data.user!, ...prev];
        });
      }
      setMessage(
        `Created ${data.user?.display_name ?? displayName} (${data.user?.username ?? username}, ${role}).`,
      );
      setDisplayName("");
      setUsername("");
      setPassword("");
      setRole("reception");
      notifyStaffUsersChanged();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user: StaffUserRow) {
    setEditingId(user.id);
    setEditName(user.display_name?.trim() || "");
    setEditRole(user.role);
    setEditActive(user.active);
    setEditPassword("");
    setMessage(null);
    setError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        id: editingId,
        displayName: editName,
        role: editRole,
        active: editActive,
      };
      if (editPassword.trim().length > 0) {
        body.password = editPassword;
      }
      const res = await fetch("/api/staff/users", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not update user");
      }
      setMessage("User updated.");
      setEditingId(null);
      notifyStaffUsersChanged();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteUser(user: StaffUserRow) {
    const ok = window.confirm(
      `Delete user “${user.display_name || user.username}” (${user.username})? This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/staff/users?id=${encodeURIComponent(user.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not delete user");
      }
      setMessage(`Deleted ${user.username}.`);
      if (editingId === user.id) setEditingId(null);
      notifyStaffUsersChanged();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user");
    }
  }

  return (
    <section
      aria-label="Create user"
      className="space-y-4 rounded-xl border border-abai-navy/10 bg-white p-4"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-abai-navy">
          Staff users
        </h2>
        <p className="mt-1 text-sm text-abai-muted">
          Owner-only. Create, edit, or delete users. New users appear here and
          under Dashboard visibility immediately so you can assign rights per
          person. Roles: owner, management, staff desk, IT manager, website API.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">Name</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">Username</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={64}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
            autoComplete="new-password"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffUserRole)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
          >
            {STAFF_USER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="min-h-10 rounded-lg bg-abai-gold px-4 text-sm font-semibold text-abai-navy disabled:opacity-70"
        >
          {loading ? "Creating…" : "Create user"}
        </button>
      </form>

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

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-abai-navy/5 text-abai-navy">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Username</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-abai-muted">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-abai-muted">
                  No users yet — env passwords still work as bootstrap.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-abai-navy/10">
                  <td className="px-3 py-2 font-medium text-abai-ink">
                    {u.display_name?.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 text-abai-ink">{u.username}</td>
                  <td className="px-3 py-2 capitalize">
                    {STAFF_USER_ROLES.find((r) => r.value === u.role)?.label ??
                      u.role}
                  </td>
                  <td className="px-3 py-2">{u.active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-abai-muted">
                    {new Date(u.created_at).toLocaleString("en-KE")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        className="text-xs font-medium text-abai-navy underline-offset-2 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUser(u)}
                        className="text-xs font-medium text-red-800 underline-offset-2 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <div className="space-y-3 rounded-lg border border-abai-navy/15 bg-abai-navy/[0.02] p-4">
          <h3 className="font-medium text-abai-navy">Edit user</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-abai-navy">Name</span>
              <input
                type="text"
                minLength={2}
                maxLength={120}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-abai-navy">Role</span>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as StaffUserRole)}
                className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
              >
                {STAFF_USER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-abai-navy">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="size-4 accent-abai-gold"
              />
              Active
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-abai-navy">
                New password (optional)
              </span>
              <input
                type="password"
                minLength={8}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
                autoComplete="new-password"
                placeholder="Leave blank to keep"
              />
            </label>
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => void saveEdit()}
              className="min-h-10 rounded-lg bg-abai-navy px-4 text-sm font-medium text-white disabled:opacity-70"
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="min-h-10 rounded-lg border border-abai-navy/20 px-4 text-sm font-medium text-abai-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
