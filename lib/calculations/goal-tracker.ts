// FFH-P07 savings-goals tracker (docs/FFH-P07_DESIGN.md, rules G1–G10 approved by Ryan on
// 2026-11-14). A SEPARATE tracker: nothing here is read by the Money Priority Engine.
//
// Month counting (G4) is copied unchanged from lib/calculations/money-priority-goal-intelligence.ts
// (fundingMonths), so the engine files are not modified. Money (G5, R1 = half-up to the cent; G9,
// R2 = progress rounded down) is computed exactly in integer cents with BigInt, never with
// binary floating point (independent review F01/F04: e.g. $4.27 / 2 must be $2.14, not $2.13).

export type GoalTrackerInput = {
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
};

export type GoalTrackerStatus =
  | "reached" // nothing left to save (G6)
  | "on_schedule_math" // a monthly amount is available (G5)
  | "no_target_date" // G7
  | "date_passed"; // G8

export type GoalTrackerResult = {
  status: GoalTrackerStatus;
  remainingAmount: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  progressPercent: number; // whole percent, rounded down, 0–100 (G9, R2)
};

// Exact cents for an amount stored as numeric(14,2). Rejects anything not representable to the cent.
export function toCents(value: number): bigint {
  const cents = Math.round(value * 100);
  // Binary float error on a numeric(14,2) value times 100 stays far below 0.05 cent; a real
  // sub-cent amount (e.g. 12.345) is 0.5 cent away and is refused.
  if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 0.05) {
    throw new Error("Amount is not a whole number of cents.");
  }
  return BigInt(cents);
}

function centsToNumber(cents: bigint): number {
  return Number(cents) / 100;
}

// Half-up division of a non-negative cent amount by a positive whole number.
function divideHalfUp(cents: bigint, divisor: bigint): bigint {
  return (cents * BigInt(2) + divisor) / (divisor * BigInt(2));
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value
    ? null
    : result;
}

// Whole calendar months from asOfDate to targetDate; a part month counts as a full month;
// at least 1 when the target is in the future; 0 when it is today or earlier.
export function fundingMonths(asOfDate: string, targetDate: string): number | null {
  const start = parseIsoDate(asOfDate);
  const target = parseIsoDate(targetDate);
  if (!start || !target) return null;
  if (target <= start) return 0;
  let months = (target.getUTCFullYear() - start.getUTCFullYear()) * 12
    + target.getUTCMonth() - start.getUTCMonth();
  if (target.getUTCDate() > start.getUTCDate()) months += 1;
  return Math.max(1, months);
}

export function evaluateSavingsGoal(input: GoalTrackerInput, asOfDate: string): GoalTrackerResult {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0
    || !Number.isFinite(input.savedAmount) || input.savedAmount < 0) {
    throw new Error("Goal amounts are invalid.");
  }
  if (input.targetDate !== null && !parseIsoDate(input.targetDate)) {
    throw new Error("Goal target date is invalid.");
  }
  const targetCents = toCents(input.targetAmount);
  const savedCents = toCents(input.savedAmount);
  const remainingCents = targetCents > savedCents ? targetCents - savedCents : BigInt(0);
  const remainingAmount = centsToNumber(remainingCents);
  // Whole percent rounded down (R2), from exact cents; a goal with money left is never 100%.
  const flooredPercent = (savedCents * BigInt(100)) / targetCents;
  const progressPercent = remainingCents > BigInt(0) ? Number(flooredPercent > BigInt(99) ? BigInt(99) : flooredPercent) : 100;
  const monthsLeft = input.targetDate === null ? null : fundingMonths(asOfDate, input.targetDate);

  if (remainingCents === BigInt(0)) {
    return { status: "reached", remainingAmount, monthsLeft, monthlyNeeded: 0, progressPercent: 100 };
  }
  if (monthsLeft === null) {
    return { status: "no_target_date", remainingAmount, monthsLeft, monthlyNeeded: null, progressPercent };
  }
  if (monthsLeft === 0) {
    return { status: "date_passed", remainingAmount, monthsLeft, monthlyNeeded: null, progressPercent };
  }
  return {
    status: "on_schedule_math",
    remainingAmount,
    monthsLeft,
    monthlyNeeded: centsToNumber(divideHalfUp(remainingCents, BigInt(monthsLeft))),
    progressPercent,
  };
}
