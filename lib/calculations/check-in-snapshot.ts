// FFH-P07 monthly check-in snapshot arithmetic (docs/FFH-P07_DESIGN.md, C4–C6, approved by
// Ryan on 2026-11-14). Net worth = asset lines − debt lines (same formula as the dashboard),
// exact to the cent using BigInt integer cents, so totals beyond 2^53 cents stay exact
// (independent review F03). A blank ("not entered") line is never treated as $0:
// net worth is then not shown at all.

export type CheckInItemType = "account" | "retirement_account" | "debt";

export type CheckInBalanceLine = {
  itemType: CheckInItemType;
  amount: number | string | null;
};

export type CheckInNetWorth =
  | { state: "complete"; netWorthCents: bigint; assetCents: bigint; debtCents: bigint }
  | { state: "incomplete"; missingCount: number };

// Exact cents from a database amount: a decimal string (to at most 2 places) or a JS number
// holding a numeric(14,2) value. Anything else fails closed.
export function amountToCents(value: number | string): bigint {
  if (typeof value === "string") {
    const match = /^(-?)(\d{1,15})(?:\.(\d{1,2}))?$/.exec(value.trim());
    if (!match) throw new Error("Check-in amount is invalid.");
    const cents = BigInt(match[2]) * BigInt(100) + BigInt((match[3] ?? "").padEnd(2, "0"));
    return match[1] === "-" ? -cents : cents;
  }
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || !Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 0.05) {
    throw new Error("Check-in amount is invalid.");
  }
  return BigInt(cents);
}

// "$1,234.56" / "-$1,234.56" from exact cents, without converting the total to a float.
export function formatCents(cents: bigint): string {
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  const dollars = new Intl.NumberFormat("en-US").format(absolute / BigInt(100));
  return `${negative ? "-" : ""}$${dollars}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}

export function checkInNetWorth(lines: readonly CheckInBalanceLine[]): CheckInNetWorth {
  let missingCount = 0;
  let assetCents = BigInt(0);
  let debtCents = BigInt(0);
  for (const line of lines) {
    if (line.amount === null || line.amount === "") {
      missingCount += 1;
      continue;
    }
    if (line.itemType === "debt") debtCents += amountToCents(line.amount);
    else if (line.itemType === "account" || line.itemType === "retirement_account") assetCents += amountToCents(line.amount);
    else throw new Error("Check-in line type is invalid.");
  }
  if (missingCount > 0) return { state: "incomplete", missingCount };
  return { state: "complete", netWorthCents: assetCents - debtCents, assetCents, debtCents };
}

// "YYYY-MM" for the current UTC month, and whether a chosen month is allowed (C1: no future months).
export function currentUtcMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function isAllowedCheckInMonth(month: string, now: Date = new Date()): boolean {
  // C1: this month or any earlier month (year 0001 onward, the first valid calendar year).
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith("0000")) return false;
  return month <= currentUtcMonth(now);
}

export function monthLabel(month: string): string {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
