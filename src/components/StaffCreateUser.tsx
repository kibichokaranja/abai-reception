"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/users", { credentials: "include" });
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
      setMessage(
        `Created ${data.user?.display_name ?? displayName} (${data.user?.username ?? username}, ${role}).`,
      );
      setDisplayName("");
      setUsername("");
      setPassword("");
      setRole("reception");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="Create user"
      className="space-y-4 rounded-xl border border-abai-navy/10 bg-white p-4"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-abai-navy">
          Create user
        </h2>
        <p className="mt-1 text-sm text-abai-muted">
          Owner-only. Name + username + password; roles: owner, management,
          reception.
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
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-abai-muted">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-abai-muted">
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
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">{u.active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-abai-muted">
                    {new Date(u.created_at).toLocaleString("en-KE")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
