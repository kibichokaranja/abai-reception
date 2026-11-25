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
import { SURVEY_QUESTION_SLIDES } from "@/lib/survey-questions";
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

function hasAccommodation(row: GuestFeedbackRow): boolean {
  const services = row.purpose_of_visit_services;
  if (Array.isArray(services) && services.includes("accommodation")) {
    return true;
  }
  return row.purpose_of_visit === "accommodation";
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

function answerForSlide(
  row: GuestFeedbackRow,
  key: string,
): { label: string; tone?: string } {
  if (key === "first_visit") {
    return { label: firstVisitLabel(row.first_visit) };
  }
  if (key === "purpose_of_visit_services") {
    return { label: servicesLabelForRow(row) };
  }
  if (key === "standout_staff_name") {
    return { label: row.standout_staff_name?.trim() || "—" };
  }
  if (key === "comment") {
    return { label: row.comment?.trim() || "—" };
  }
  if (key === "value_for_money") {
    return {
      label: row.value_for_money
        ? row.value_for_money.charAt(0).toUpperCase() +
          row.value_for_money.slice(1)
        : "—",
    };
  }
  if (key === "recommend_score") {
    return { label: recommendLabelForRow(row) };
  }
  const raw = row[key as keyof GuestFeedbackRow];
  if (typeof raw === "number") {
    return { label: String(raw), tone: scoreTone(raw) };
  }
  if (typeof raw === "string") {
    return { label: raw };
  }
  return { label: isSurveyV2Row(row) ? "N/A" : "—" };
}

/** Expand row → slide through every survey question for this guest. */
function RowQuestionSlider({ row }: { row: GuestFeedbackRow }) {
  const [index, setIndex] = useState(0);
  const slides = SURVEY_QUESTION_SLIDES;
  const slide = slides[index] ?? slides[0];
  const answer = answerForSlide(row, slide.key);

  return (
    <div className="rounded-lg border border-abai-navy/10 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-abai-muted">
          Question {slide.number} of {slides.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-abai-navy/20 px-2 py-1 text-xs font-medium text-abai-navy disabled:opacity-40"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-abai-navy/20 px-2 py-1 text-xs font-medium text-abai-navy disabled:opacity-40"
            disabled={index >= slides.length - 1}
            onClick={() =>
              setIndex((i) => Math.min(slides.length - 1, i + 1))
            }
          >
            Next
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-abai-ink">{slide.fullLabel}</p>
      <p className={`mt-2 text-base font-semibold ${answer.tone ?? "text-abai-navy"}`}>
        {answer.label}
      </p>
    </div>
  );
}

function FeedbackRow({
  row,
  showGuestDetails,
  showComments,
  canApprove,
  canMarkIrrelevant,
  detailOpen,
  onToggleDetail,
  onAction,
}: {
  row: GuestFeedbackRow;
  showGuestDetails: boolean;
  showComments: boolean;
  canApprove: boolean;
  canMarkIrrelevant: boolean;
  detailOpen: boolean;
  onToggleDetail: () => void;
  onAction: (
    id: string,
    action: "approve" | "reject" | "mark_irrelevant" | "clear_irrelevant",
  ) => void;
}) {
  const overall = overallForRow(row);
  const v2 = isSurveyV2Row(row);
  const visit = visitColumnLabel(row);
  const showRoomNearDate = hasAccommodation(row) && Boolean(row.room_number?.trim());
  const showActions = canApprove || canMarkIrrelevant;
  const colSpan =
    6 +
    (showGuestDetails ? 3 : 0) +
    (showComments ? 1 : 0) +
    (showActions ? 1 : 0);

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
          {showRoomNearDate ? (
            <span className="mt-1 block text-xs font-medium text-abai-navy">
              Room {row.room_number!.trim()}
            </span>
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
            onClick={onToggleDetail}
            aria-expanded={detailOpen}
          >
            {detailOpen ? "Hide detail" : "Show detail"}
          </button>
        </td>
        {showActions ? (
          <td className="px-3 py-3">
            <div className="flex flex-col gap-1">
              {row.approval_status === "pending" ? (
                canApprove ? (
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
                ) : (
                  <span className="text-xs text-abai-muted">
                    Awaiting approval
                  </span>
                )
              ) : canMarkIrrelevant ? (
                row.is_irrelevant ? (
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
                )
              ) : null}
            </div>
          </td>
        ) : null}
      </tr>
      {detailOpen ? (
        <tr className="border-t border-abai-navy/5 bg-white/70">
          <td colSpan={colSpan} className="px-3 py-4">
            <RowQuestionSlider row={row} />
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
  can_approve_feedback: true,
};

type Props = {
  title?: string;
  canExport?: boolean;
  canManageUsers?: boolean;
  canEditPermissions?: boolean;
  /** Owner + IT manager (+ management with grant) can moderate; management sees pending. */
  canModerate?: boolean;
  /** Open on the pending-approval queue (IT dashboard). */
  defaultPendingMode?: boolean;
  /** Highlight the pre-live review gate section. */
  reviewGateEmphasis?: boolean;
};

export function StaffFeedbackList({
  title = "Guest Feedback",
  canExport = false,
  canManageUsers = false,
  canEditPermissions = false,
  canModerate = false,
  defaultPendingMode = false,
  reviewGateEmphasis = false,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<GuestFeedbackRow[]>([]);
  const [statsRows, setStatsRows] = useState<GuestFeedbackRow[]>([]);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [permissions, setPermissions] =
    useState<DashboardPermissions | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [apiCanApprove, setApiCanApprove] = useState(false);
  const [apiCanMarkIrrelevant, setApiCanMarkIrrelevant] = useState(false);
  const [apiCanViewPending, setApiCanViewPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [hideIrrelevant, setHideIrrelevant] = useState(true);
  const [pendingMode, setPendingMode] = useState(defaultPendingMode);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [tableExpanded, setTableExpanded] = useState(true);
  const [openDetailIds, setOpenDetailIds] = useState<Set<string>>(
    () => new Set(),
  );

  const effectivePermissions = permissions ?? OWNER_DEFAULTS;
  const showGuestDetails =
    canManageUsers ||
    role === "owner" ||
    role === "it_manager" ||
    effectivePermissions.show_guest_details;

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
        canApprove?: boolean;
        canMarkIrrelevant?: boolean;
        canViewPending?: boolean;
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
      setApiCanApprove(Boolean(data.canApprove));
      setApiCanMarkIrrelevant(Boolean(data.canMarkIrrelevant));
      setApiCanViewPending(Boolean(data.canViewPending));
      // Drop detail expands for rows that are no longer in the list.
      setOpenDetailIds((prev) => {
        if (prev.size === 0) return prev;
        const ids = new Set(list.map((r) => r.id));
        const next = new Set<string>();
        for (const id of prev) {
          if (ids.has(id)) next.add(id);
        }
        return next;
      });
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

  const allowExport =
    canExport || role === "owner" || effectivePermissions.show_export;
  // Trust API flags (owner/IT always; management only when grant is on).
  const canApprove =
    apiCanApprove || role === "owner" || role === "it_manager";
  // Mark irrelevant: IT manager + admin/owner only (never management/reception).
  const canMarkIrrelevant =
    apiCanMarkIrrelevant || role === "owner" || role === "it_manager";
  const canViewPendingQueue =
    canModerate ||
    apiCanViewPending ||
    role === "owner" ||
    role === "management" ||
    role === "it_manager";
  const showActions = canApprove || canMarkIrrelevant;

  function toggleRowDetail(id: string) {
    setOpenDetailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAllRowDetails() {
    setOpenDetailIds(new Set(rows.map((r) => r.id)));
  }

  function collapseAllRowDetails() {
    setOpenDetailIds(new Set());
  }

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
    (showActions ? 1 : 0);

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

      {canViewPendingQueue ? (
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
        role === "owner" ||
        allowExport ||
        canMarkIrrelevant) && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-abai-navy/10 bg-white p-4">
          {(effectivePermissions.show_date_filters || role === "owner") &&
          !pendingMode ? (
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
          {(effectivePermissions.show_low_score_filter || role === "owner") &&
          !pendingMode ? (
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
          {canMarkIrrelevant && !pendingMode ? (
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
          {canMarkIrrelevant && !pendingMode ? (
            <p className="basis-full text-xs text-abai-muted">
              Mark a review <strong>irrelevant</strong> when it is blank,
              off-topic, or low-signal (IT manager or owner only). With “Hide
              irrelevant from analytics” on, those rows stay in the table
              (dimmed) but are excluded from averages, carousel, and exports.
              Live system reviews require <strong>IT manager</strong> or owner
              approval (or management with the approve-reviews right).
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

      {(effectivePermissions.show_feedback_list ||
        pendingMode ||
        role === "owner" ||
        role === "it_manager") && (
        <section
          aria-label={
            pendingMode ? "Pending review gate" : "Feedback table"
          }
          className={`space-y-3 rounded-xl border p-4 ${
            reviewGateEmphasis && pendingMode
              ? "border-abai-gold/50 bg-abai-gold/[0.06]"
              : "border-abai-navy/10 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-abai-navy">
                {pendingMode
                  ? "Review gate — pending before live system"
                  : "Feedback table"}
              </h2>
              <p className="mt-0.5 text-sm text-abai-muted">
                {pendingMode
                  ? canApprove
                    ? "Approve or reject submissions before they appear on approved dashboards and public reviews."
                    : "Pending queue (view only). Approval is limited to IT manager, owner, or management with the grant."
                  : countLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tableExpanded && rows.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={expandAllRowDetails}
                    className="min-h-10 rounded-lg border border-abai-navy/20 px-3 text-sm font-medium text-abai-navy hover:bg-abai-navy/5"
                  >
                    Expand all details
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllRowDetails}
                    className="min-h-10 rounded-lg border border-abai-navy/20 px-3 text-sm font-medium text-abai-navy hover:bg-abai-navy/5"
                  >
                    Collapse all details
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setTableExpanded((v) => !v)}
                aria-expanded={tableExpanded}
                className="min-h-10 rounded-lg bg-abai-navy px-4 text-sm font-medium text-white"
              >
                {tableExpanded ? "Collapse table" : "Expand table"}
              </button>
            </div>
          </div>

          {tableExpanded ? (
            <div className="overflow-x-auto rounded-lg border border-abai-navy/10">
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
                    {showActions ? (
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
                      canApprove={canApprove}
                      canMarkIrrelevant={canMarkIrrelevant}
                      detailOpen={openDetailIds.has(row.id)}
                      onToggleDetail={() => toggleRowDetail(row.id)}
                      onAction={onModerate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-abai-muted">
              Table collapsed. Use Expand table to show rows again.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
