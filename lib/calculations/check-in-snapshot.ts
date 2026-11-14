// FFH-P07 monthly check-in snapshot arithmetic (docs/FFH-P07_DESIGN.md, C4–C6, approved by
// Ryan on 2026-11-14). Net worth = asset lines − debt lines (same formula as the dashboard),
// exact to the cent using integer cents. A blank ("not entered") line is never treated as $0:
// net worth is then not shown at all.

export type CheckInItemType = "account" | "retirement_account" | "debt";

export type CheckInBalanceLine = {
  itemType: CheckInItemType;
  amount: number | string | null;
};

export type CheckInNetWorth =
  | { state: "complete"; netWorth: number; assets: number; debts: number }
  | { state: "incomplete"; missingCount: number };

function cents(value: number | string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error("Check-in amount is invalid.");
  return Math.round(number * 100);
}

export function checkInNetWorth(lines: readonly CheckInBalanceLine[]): CheckInNetWorth {
  let missingCount = 0;
  let assetCents = 0;
  let debtCents = 0;
  for (const line of lines) {
    if (line.amount === null || line.amount === "") {
      missingCount += 1;
      continue;
    }
    if (line.itemType === "debt") debtCents += cents(line.amount);
    else if (line.itemType === "account" || line.itemType === "retirement_account") assetCents += cents(line.amount);
    else throw new Error("Check-in line type is invalid.");
  }
  if (missingCount > 0) return { state: "incomplete", missingCount };
  return { state: "complete", netWorth: (assetCents - debtCents) / 100, assets: assetCents / 100, debts: debtCents / 100 };
}

// "YYYY-MM" for the current UTC month, and whether a chosen month is allowed (C1: no future months).
export function currentUtcMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function isAllowedCheckInMonth(month: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;
  const year = Number(month.slice(0, 4));
  if (year < 2000) return false;
  return month <= currentUtcMonth(now);
}

export function monthLabel(month: string): string {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
