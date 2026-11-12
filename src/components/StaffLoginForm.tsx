"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  title?: string;
  description?: string;
  /** POST endpoint that accepts `{ password }` and sets the session cookie. */
  loginPath?: string;
};

export function StaffLoginForm({
  title = "Owner login",
  description = "Enter the owner password to browse full guest feedback and analytics.",
  loginPath = "/api/staff/login",
}: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(loginPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 max-w-md space-y-4 rounded-2xl border border-abai-navy/10 bg-white p-6 shadow-sm"
    >
      <h1 className="font-display text-3xl font-semibold text-abai-navy">
        {title}
      </h1>
      <p className="text-sm text-abai-muted">{description}</p>
      <label className="block space-y-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-abai-navy">
          Password
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-lg border-2 border-abai-navy/15 px-3 outline-none focus:border-abai-gold"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full rounded-xl bg-abai-gold font-semibold text-abai-navy hover:bg-abai-gold-hover disabled:opacity-70"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
