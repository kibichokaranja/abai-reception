import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  overallForRow,
  recommendLabelForRow,
} from "@/lib/staff-analytics";
import {
  servicesLabelForRow,
  type GuestFeedbackRow,
} from "@/lib/types";
import { formatVisitDate } from "@/lib/visit-date";

function firstVisitLabel(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function visitLabel(row: GuestFeedbackRow): string {
  const date = row.visit_date ? formatVisitDate(row.visit_date) : "";
  let time = "";
  try {
    time = new Intl.DateTimeFormat("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(row.created_at));
  } catch {
    time = "";
  }
  return [date, time].filter(Boolean).join(" ");
}

function rowCells(row: GuestFeedbackRow): string[] {
  return [
    visitLabel(row),
    row.phone?.trim() || "",
    firstVisitLabel(row.first_visit),
    servicesLabelForRow(row) === "—" ? "" : servicesLabelForRow(row),
    overallForRow(row) == null ? "" : String(overallForRow(row)),
    recommendLabelForRow(row) === "—" ? "" : recommendLabelForRow(row),
    row.value_for_money ?? "",
    row.standout_staff_name?.trim() || "",
    row.comment?.trim() || "",
    row.reservation_ease == null ? "" : String(row.reservation_ease),
    row.welcome_check_in == null ? "" : String(row.welcome_check_in),
    row.accommodation_comfort == null ? "" : String(row.accommodation_comfort),
    row.conference_facilities == null ? "" : String(row.conference_facilities),
    row.wifi_quality == null ? "" : String(row.wifi_quality),
    row.recreational_leisure == null ? "" : String(row.recreational_leisure),
    row.spa_experience == null ? "" : String(row.spa_experience),
    row.cleanliness_upkeep == null ? "" : String(row.cleanliness_upkeep),
    row.food_taste_quality == null ? "" : String(row.food_taste_quality),
    row.service_promptness == null ? "" : String(row.service_promptness),
    row.staff_friendliness == null ? "" : String(row.staff_friendliness),
    row.safety_security == null ? "" : String(row.safety_security),
    row.overall_experience == null ? "" : String(row.overall_experience),
    row.recommend_score == null ? "" : String(row.recommend_score),
  ];
}

const HEADERS = [
  "Visit",
  "Phone",
  "First visit",
  "Services",
  "Overall",
  "Recommend",
  "Value",
  "Standout",
  "Comment",
  "Reservation",
  "Welcome",
  "Accommodation",
  "Conference",
  "Wi-Fi",
  "Leisure",
  "Spa",
  "Cleanliness",
  "Food",
  "Service",
  "Staff",
  "Safety",
  "Overall exp",
  "Recommend score",
];

export async function buildExcelBuffer(
  rows: GuestFeedbackRow[],
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Abai Reception";
  const sheet = workbook.addWorksheet("Guest feedback");
  sheet.addRow(HEADERS);
  for (const row of rows) {
    sheet.addRow(rowCells(row));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 14;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function buildPdfBuffer(rows: GuestFeedbackRow[]): ArrayBuffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Abai Lodges & Spa — Guest Feedback", 40, 36);
  doc.setFontSize(9);
  doc.text(`${rows.length} response${rows.length === 1 ? "" : "s"}`, 40, 52);

  const summaryHeaders = [
    "Visit",
    "Phone",
    "First",
    "Services",
    "Overall",
    "Recommend",
    "Value",
    "Comment",
  ];
  const summaryRows = rows.map((row) => [
    visitLabel(row),
    row.phone?.trim() || "—",
    firstVisitLabel(row.first_visit) || "—",
    servicesLabelForRow(row),
    overallForRow(row) == null ? "—" : String(overallForRow(row)),
    recommendLabelForRow(row),
    row.value_for_money ?? "—",
    (row.comment?.trim() || "—").slice(0, 80),
  ]);

  autoTable(doc, {
    startY: 64,
    head: [summaryHeaders],
    body: summaryRows,
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [26, 43, 74] },
    margin: { left: 24, right: 24 },
  });

  return doc.output("arraybuffer");
}
