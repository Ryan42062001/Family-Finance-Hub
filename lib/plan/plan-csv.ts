// FFH-P09 CSV export of the CURRENT authoritative Money Plan steps (issue #170). Pure: takes the same view the plan
// page renders. Columns are fixed; no internal ids, technical wording, emails or household identifiers are written.
//
// Spreadsheet safety: every cell is quoted (commas, quotes and line breaks stay inside the cell) and any cell that a
// spreadsheet could read as a formula is neutralised with a leading apostrophe. "Could read as a formula" means the
// first character after any leading whitespace or control characters is = + - @ (or their full-width forms), or the
// cell itself starts with a tab or carriage return.
import type { MoneyPlanView, PlanStep } from "./money-plan.ts";

export const PLAN_CSV_HEADER = ["Order", "Step", "Status", "Monthly amount (USD)", "Goes to", "Why"] as const;

// Whitespace, C0/C1 controls, and Unicode spaces/format characters that spreadsheets may skip before a formula.
const LEADING_IGNORABLE = /^[\s\u0000-\u001f\u007f-\u009f\u00a0\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u2064\u3000\ufeff]*/;
const FORMULA_START = /^[=+\-@\uff1d\uff0b\uff0d\uff20]/;

export function neutralizeCell(value: string): string {
  const rest = value.replace(LEADING_IGNORABLE, "");
  if (FORMULA_START.test(rest) || /^[\t\r]/.test(value)) return `'${value}`;
  return value;
}

export function csvCell(value: string): string {
  return `"${neutralizeCell(value).replace(/"/g, '""')}"`;
}

// Exact cents, matching formatPlanMoney's rounding, without currency symbol or grouping (spreadsheet-friendly).
const AMOUNT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
export function csvAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "";
  return AMOUNT.format(value);
}

export function planStepsInOrder(view: MoneyPlanView): PlanStep[] {
  return [...view.steps, ...view.needsInformation].sort((a, b) => a.rank - b.rank);
}

export function planStepsCsv(view: MoneyPlanView): string {
  const rows: string[][] = [[...PLAN_CSV_HEADER]];
  planStepsInOrder(view).forEach((step, index) => {
    rows.push([String(index + 1), step.title, step.stateLabel, csvAmount(step.monthlyAmount), step.destinations.join("; "), step.explanation]);
  });
  // UTF-8 byte-order mark so spreadsheet apps read accented names correctly; CRLF per RFC 4180.
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
