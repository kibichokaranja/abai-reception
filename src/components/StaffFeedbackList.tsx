"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryAveragesPanel } from "@/components/CategoryAveragesPanel";
import { OwnerPermissionsEditor } from "@/components/OwnerPermissionsEditor";
import { QuestionCarousel } from "@/components/QuestionCarousel";
import { StaffAnalyticsSummary } from "@/components/StaffAnalyticsSummary";
import { StaffCreateUser } from "@/components/StaffCreateUser";
import type { DashboardPermissions } from "@/lib/dashboard-permissions";
import {
  isSurveyV2Row,
  overallForRow,
  recommendLabelForRow,
  type StaffAnalytics,
} from "@/lib/staff-analytics";
import {
  servicesLabelForRow,
  type GuestFeedbackRow,
} from "@/lib/types";
import { formatVisitDate } from "@/lib/visit-date";

function firstVisitLabel(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function visitColumnLabel(row: GuestFeedbackRow) {
  const datePart = row.visit_date
    ? formatVisitDate(row.visit_date)
    : (() => {
        try {
          return new Intl.DateTimeFormat("en-KE", {
            timeZone: "Africa/Nairobi",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(row.created_at));
        } catch {
          return "—";
        }
      })();
  let timePart = "";
  try {
    timePart = new Intl.DateTimeFormat("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(row.created_at));
  } catch {
    timePart = "";
  }
  return { datePart, timePart };
}

/** Low scores: navy/black (not red), per batch request. */
function scoreTone(value: number | null) {
  if (value == null) return "text-abai-muted";
  if (value <= 2.5) return "font-semibold text-abai-navy";
  if (value === 3) return "text-amber-800";
  return "text-emerald-800";
}

function formatScore(value: number | null | undefined, naLabel = "N/A") {
  if (value == null) return naLabel;
  return String(value);
}

function TextCell({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) {
    return <span className="text-abai-muted">—</span>;
  }
  const long = text.length > 80;
  return (
    <div className="max-w-[14rem]">
      <p className={`text-abai-ink ${open ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-abai-navy underline-offset-2 hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

const V2_DETAIL_FIELDS: { key: keyof GuestFeedbackRow; label: string }[] = [
  { key: "reservation_ease", label: "Reservation" },
  { key: "welcome_check_in", label: "Welcome / check-in" },
  { key: "accommodation_comfort", label: "Accommodation" },
  { key: "conference_facilities", label: "Conference" },
  { key: "wifi_quality", label: "Wi‑Fi" },
  { key: "recreational_leisure", label: "Leisure" },
  { key: "spa_experience", label: "Spa" },
  { key: "cleanliness_upkeep", label: "Cleanliness" },
  { key: "food_taste_quality", label: "Food" },
  { key: "service_promptness", label: "Service" },
  { key: "staff_friendliness", label: "Staff" },
  { key: "safety_security", label: "Safety" },
  { key: "overall_experience", label: "Overall" },
  { key: "recommend_score", label: "Recommend" },
  { key: "value_for_money", label: "Value for money" },
];

const LEGACY_DETAIL_FIELDS: { key: keyof GuestFeedbackRow; label: string }[] = [
  { key: "overall_stay", label: "Overall stay" },
  { key: "check_in", label: "Check-in" },
  { key: "room_cleanliness", label: "Room" },
  { key: "food_drink", label: "F&B" },
  { key: "spa_fitness", label: "Spa" },
  { key: "staff_experience", label: "Staff" },
  { key: "recommend", label: "Recommend" },
];

function DetailScores({ row }: { row: GuestFeedbackRow }) {
  const v2 = isSurveyV2Row(row);
  const fields = v2 ? V2_DETAIL_FIELDS : LEGACY_DETAIL_FIELDS;
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map(({ key, label }) => {
        const raw = row[key];
        const display =
          key === "recommend_score"
            ? recommendLabelForRow(row)
            : raw == null
              ? v2 && typeof raw !== "string"
                ? "N/A"
                : "—"
              : String(raw);
        const tone =
          typeof raw === "number" && key !== "recommend_score"
            ? scoreTone(raw)
            : "text-abai-ink capitalize";
        return (
          <div key={String(key)} className="min-w-0">
            <dt className="text-xs text-abai-muted">{label}</dt>
            <dd className={`text-sm font-medium ${tone}`}>{display}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function FeedbackRow({
  row,
  showGuestDetails,
  showComments,
  canModerate,
  onAction,
}: {
  row: GuestFeedbackRow;
  showGuestDetails: boolean;
  showComments: boolean;
  canModerate: boolean;
  onAction: (
    id: string,
    action: "approve" | "reject" | "mark_irrelevant" | "clear_irrelevant",
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const overall = overallForRow(row);
  const v2 = isSurveyV2Row(row);
  const visit = visitColumnLabel(row);
  const colSpan =
    6 + (showGuestDetails ? 3 : 0) + (showComments ? 1 : 0) + (canModerate ? 1 : 0);

  return (
    <>
      <tr
        className={`border-t border-abai-navy/10 align-top ${
          row.is_irrelevant ? "bg-abai-navy/[0.03] opacity-80" : ""
        }`}
      >
        <td className="whitespace-nowrap px-3 py-3 text-abai-ink">
          <span className="block font-medium">{visit.datePart}</span>
          {visit.timePart ? (
            <span className="block text-xs text-abai-muted">{visit.timePart}</span>
          ) : null}
          {row.is_irrelevant ? (
            <span className="mt-1 inline-block text-xs font-medium text-abai-muted">
              Irrelevant
            </span>
          ) : null}
        </td>
        {showGuestDetails ? (
          <>
            <td className="max-w-[10rem] px-3 py-3">
              {row.guest_name?.trim() ? (
                <span className="font-medium text-abai-ink">
                  {row.guest_name.trim()}
                </span>
              ) : (
                <span className="text-abai-muted">—</span>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              {row.phone?.trim() ? row.phone : (
                <span className="text-abai-muted">—</span>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              {row.room_number?.trim() ? row.room_number : (
                <span className="text-abai-muted">—</span>
              )}
            </td>
          </>
        ) : null}
        <td className="whitespace-nowrap px-3 py-3">
          {firstVisitLabel(row.first_visit)}
        </td>
        <td className="max-w-[12rem] px-3 py-3">
          {servicesLabelForRow(row)}
        </td>
        <td className={`px-3 py-3 ${scoreTone(overall)}`}>
          {formatScore(overall, "—")}
          {!v2 ? (
            <span className="ml-1 text-xs font-normal text-abai-muted">legacy</span>
          ) : null}
        </td>
        <td className="px-3 py-3 capitalize">{recommendLabelForRow(row)}</td>
        <td className="px-3 py-3 capitalize">
          {row.value_for_money ?? "—"}
        </td>
        {showComments ? (
          <td className="px-3 py-3">
            <TextCell text={row.comment} />
          </td>
        ) : null}
        <td className="px-3 py-3">
          <button
            type="button"
            className="text-xs font-medium text-abai-navy underline-offset-2 hover:underline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide" : "Scores"}
          </button>
        </td>
        {canModerate ? (
          <td className="px-3 py-3">
            <div className="flex flex-col gap-1">
              {row.approval_status === "pending" ? (
                <>
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
                    onClick={() => onAction(row.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-red-800 underline-offset-2 hover:underline"
                    onClick={() => onAction(row.id, "reject")}
                  >
                    Reject
                  </button>
                </>
              ) : row.is_irrelevant ? (
                <button
                  type="button"
                  className="text-left text-xs font-medium text-abai-navy underline-offset-2 hover:underline"
                  onClick={() => onAction(row.id, "clear_irrelevant")}
                >
                  Include in analytics
                </button>
              ) : (
                <button
                  type="button"
                  className="text-left text-xs font-medium text-abai-muted underline-offset-2 hover:underline"
                  onClick={() => onAction(row.id, "mark_irrelevant")}
                  title="Mark as low-signal / irrelevant so analytics can exclude it"
                >
                  Mark irrelevant
                </button>
              )}
            </div>
          </td>
        ) : null}
      </tr>
      {open ? (
        <tr className="border-t border-abai-navy/5 bg-white/70">
          <td colSpan={colSpan} className="px-3 py-4">
            <DetailScores row={row} />
            {showGuestDetails && row.standout_staff_name?.trim() ? (
              <p className="mt-3 text-sm text-abai-ink">
                <span className="text-abai-muted">Standout: </span>
                {row.standout_staff_name.trim()}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

const OWNER_DEFAULTS: DashboardPermissions = {
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
};

type Props = {
  title?: string;
  canExport?: boolean;
  canManageUsers?: boolean;
  canEditPermissions?: boolean;
  /** Owner + management can approve pending and mark irrelevant. */
  canModerate?: boolean;
};

export function StaffFeedbackList({
  title = "Guest Feedback",
  canExport = false,
  canManageUsers = false,
  canEditPermissions = false,
  canModerate = false,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<GuestFeedbackRow[]>([]);
  const [statsRows, setStatsRows] = useState<GuestFeedbackRow[]>([]);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [permissions, setPermissions] =
    useState<DashboardPermissions | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [hideIrrelevant, setHideIrrelevant] = useState(true);
  const [pendingMode, setPendingMode] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const effectivePermissions = permissions ?? OWNER_DEFAULTS;
  const showGuestDetails =
    canManageUsers || effectivePermissions.show_guest_details;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (lowOnly) params.set("low", "1");
      if (hideIrrelevant && !pendingMode) params.set("hideIrrelevant", "1");
      if (pendingMode) params.set("pending", "1");
      const res = await fetch(`/api/staff/feedback?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        feedback?: GuestFeedbackRow[];
        rowsForStats?: GuestFeedbackRow[];
        analytics?: StaffAnalytics | null;
        permissions?: DashboardPermissions;
        role?: string;
        error?: string;
        debug?: {
          urlHost?: string | null;
          serviceKeyEnv?: string;
          supabaseCode?: string | null;
        };
      };
      if (!res.ok) {
        const debugBits = data.debug
          ? [
              data.debug.serviceKeyEnv && `env=${data.debug.serviceKeyEnv}`,
              data.debug.urlHost && `host=${data.debug.urlHost}`,
              data.debug.supabaseCode && `code=${data.debug.supabaseCode}`,
            ]
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(
          [data.error || "Failed to load feedback", debugBits]
            .filter(Boolean)
            .join(" "),
        );
      }
      const list = data.feedback ?? [];
      setRows(list);
      setStatsRows(data.rowsForStats ?? list);
      setAnalytics(data.analytics ?? null);
      if (data.permissions) setPermissions(data.permissions);
      if (data.role) setRole(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lowOnly, hideIrrelevant, pendingMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = useMemo(() => {
    if (loading) return "Loading…";
    if (pendingMode) {
      return `${rows.length} pending`;
    }
    if (!effectivePermissions.show_feedback_list && analytics) {
      return `${analytics.total} response${analytics.total === 1 ? "" : "s"}`;
    }
    return `${rows.length} response${rows.length === 1 ? "" : "s"}`;
  }, [
    loading,
    rows.length,
    effectivePermissions.show_feedback_list,
    analytics,
    pendingMode,
  ]);

  const allowExport = canExport || effectivePermissions.show_export;
  const moderate =
    canModerate || role === "owner" || role === "management";

  async function logout() {
    await fetch("/api/staff/logout", {
      method: "POST",
      credentials: "include",
    });
    router.refresh();
  }

  async function downloadExport(format: "pdf" | "xlsx") {
    setExporting(format);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (lowOnly) params.set("low", "1");
      if (hideIrrelevant) params.set("hideIrrelevant", "1");
      const res = await fetch(`/api/staff/export?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "pdf"
          ? `abai-feedback-summary-${new Date().toISOString().slice(0, 10)}.pdf`
          : `abai-feedback-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function onModerate(
    id: string,
    action: "approve" | "reject" | "mark_irrelevant" | "clear_irrelevant",
  ) {
    setError(null);
    try {
      const res = await fetch("/api/staff/feedback", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not update feedback");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update feedback");
    }
  }

  const tableColCount =
    6 +
    (showGuestDetails ? 3 : 0) +
    (effectivePermissions.show_comments ? 1 : 0) +
    (moderate ? 1 : 0);

  return (
    <div className="mx-auto max-w-none space-y-6 px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-abai-navy sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-abai-muted">{countLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-abai-navy/20 px-4 py-2 text-sm font-medium text-abai-navy hover:bg-white"
        >
          Sign out
        </button>
      </div>

      {moderate ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPendingMode(false)}
            className={`min-h-10 rounded-lg px-4 text-sm font-medium ${
              !pendingMode
                ? "bg-abai-navy text-white"
                : "border border-abai-navy/20 text-abai-navy hover:bg-white"
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setPendingMode(true)}
            className={`min-h-10 rounded-lg px-4 text-sm font-medium ${
              pendingMode
                ? "bg-abai-navy text-white"
                : "border border-abai-navy/20 text-abai-navy hover:bg-white"
            }`}
          >
            Pending approval
          </button>
        </div>
      ) : null}

      {(effectivePermissions.show_date_filters ||
        effectivePermissions.show_low_score_filter ||
        allowExport ||
        moderate) && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-abai-navy/10 bg-white p-4">
          {effectivePermissions.show_date_filters && !pendingMode ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-abai-navy">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-abai-navy">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
                />
              </label>
            </>
          ) : null}
          {effectivePermissions.show_low_score_filter && !pendingMode ? (
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-abai-navy">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="size-4 accent-abai-gold"
              />
              Low scores only (≤2.5)
            </label>
          ) : null}
          {moderate && !pendingMode ? (
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-abai-navy">
              <input
                type="checkbox"
                checked={hideIrrelevant}
                onChange={(e) => setHideIrrelevant(e.target.checked)}
                className="size-4 accent-abai-gold"
              />
              Hide irrelevant from analytics
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-10 rounded-lg bg-abai-navy px-4 text-sm font-medium text-white"
          >
            Refresh
          </button>
          {allowExport && !pendingMode ? (
            <>
              <button
                type="button"
                disabled={exporting != null}
                onClick={() => void downloadExport("xlsx")}
                className="min-h-10 rounded-lg border border-abai-navy/20 px-4 text-sm font-medium text-abai-navy hover:bg-white disabled:opacity-60"
              >
                {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
              </button>
              <button
                type="button"
                disabled={exporting != null}
                onClick={() => void downloadExport("pdf")}
                className="min-h-10 rounded-lg border border-abai-navy/20 px-4 text-sm font-medium text-abai-navy hover:bg-white disabled:opacity-60"
              >
                {exporting === "pdf" ? "Exporting…" : "Export PDF summary"}
              </button>
            </>
          ) : null}
          {moderate && !pendingMode ? (
            <p className="basis-full text-xs text-abai-muted">
              Mark a review <strong>irrelevant</strong> when it is blank,
              off-topic, or low-signal. With “Hide irrelevant from analytics”
              on, those rows stay in the table (dimmed) but are excluded from
              averages, carousel, and exports.
            </p>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !pendingMode && effectivePermissions.show_analytics ? (
        <StaffAnalyticsSummary
          analytics={analytics}
          loading={loading}
          lowOnly={lowOnly}
        />
      ) : null}

      {!error &&
      !pendingMode &&
      effectivePermissions.show_category_averages &&
      !effectivePermissions.show_analytics ? (
        <CategoryAveragesPanel analytics={analytics} loading={loading} />
      ) : null}

      {!error &&
      !pendingMode &&
      effectivePermissions.show_question_carousel ? (
        <QuestionCarousel
          rows={statsRows.length > 0 ? statsRows : rows}
          analytics={analytics}
          loading={loading}
        />
      ) : null}

      {canManageUsers ? <StaffCreateUser /> : null}
      {canEditPermissions ? <OwnerPermissionsEditor /> : null}

      {(effectivePermissions.show_feedback_list || pendingMode) && (
        <div className="overflow-x-auto rounded-xl border border-abai-navy/10 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-abai-navy text-white">
              <tr>
                <th className="px-3 py-3 font-medium">Visit</th>
                {showGuestDetails ? (
                  <>
                    <th className="px-3 py-3 font-medium">Guest</th>
                    <th className="px-3 py-3 font-medium">Phone</th>
                    <th className="px-3 py-3 font-medium">Room</th>
                  </>
                ) : null}
                <th className="px-3 py-3 font-medium">First visit</th>
                <th className="px-3 py-3 font-medium">Services</th>
                <th className="px-3 py-3 font-medium">Overall</th>
                <th className="px-3 py-3 font-medium">Recommend</th>
                <th className="px-3 py-3 font-medium">Value</th>
                {effectivePermissions.show_comments ? (
                  <th className="px-3 py-3 font-medium">Comment</th>
                ) : null}
                <th className="px-3 py-3 font-medium">Detail</th>
                {moderate ? (
                  <th className="px-3 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={tableColCount}
                    className="px-3 py-8 text-center text-abai-muted"
                  >
                    {pendingMode
                      ? "No pending submissions."
                      : "No feedback matches these filters."}
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <FeedbackRow
                  key={row.id}
                  row={row}
                  showGuestDetails={showGuestDetails}
                  showComments={effectivePermissions.show_comments}
                  canModerate={moderate}
                  onAction={onModerate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
