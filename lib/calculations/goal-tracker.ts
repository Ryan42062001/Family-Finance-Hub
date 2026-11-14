// FFH-P07 savings-goals tracker (docs/FFH-P07_DESIGN.md, rules G1–G10 approved by Ryan on
// 2026-11-14). A SEPARATE tracker: nothing here is read by the Money Priority Engine.
//
// Month counting (G4) and cent rounding (G5, R1 = half-up) are copied unchanged from
// lib/calculations/money-priority-goal-intelligence.ts (fundingMonths / roundMoney), so the
// engine files are not modified. goal-tracker.test.ts checks the two give the same answers.

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

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  const remainingAmount = roundMoney(Math.max(0, input.targetAmount - input.savedAmount));
  // Whole percent rounded down, so 99.6% never shows as 100% (R2). The tiny epsilon only
  // absorbs binary float error (0.29 * 100 = 28.999…); a goal with money left is never 100%.
  const progressPercent = Math.min(remainingAmount > 0 ? 99 : 100,
    Math.floor(((input.savedAmount / input.targetAmount) * 100) + 1e-9));
  const monthsLeft = input.targetDate === null ? null : fundingMonths(asOfDate, input.targetDate);

  if (remainingAmount === 0) {
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
    monthlyNeeded: roundMoney(remainingAmount / monthsLeft),
    progressPercent,
  };
}
