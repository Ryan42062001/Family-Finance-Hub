import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

export type GoalNecessity = "essential" | "important" | "optional" | "unknown";
export type GoalDeadlineFlexibility = "fixed" | "limited" | "flexible" | "unknown";
export type GoalNature = "preservation" | "improvement" | "mixed" | "unknown";
export type GoalConsequenceSeverity = "critical" | "high" | "moderate" | "low" | "unknown";
export type GoalPriorityBand = "high" | "medium" | "low" | "discretionary" | "unclassified";
export type GoalScheduleState = "funded" | "on_track" | "behind" | "past_due" | "more_information_needed";
export type GoalReasonableness = "reasonable" | "potentially_high" | "more_information_needed";
export type GoalDebtExposure = "none" | "low" | "moderate" | "high" | "unknown";

export type GoalIntelligenceResult = {
  goalId: string;
  goalName: string;
  goalClass: string;
  underlyingNeed: string | null;
  desiredSolution: string | null;
  necessity: GoalNecessity;
  goalNature: GoalNature;
  deadline: string | null;
  deadlineFlexibility: GoalDeadlineFlexibility;
  targetAmount: number;
  coreNeedAmount: number | null;
  eligibleSavedAmount: number;
  remainingTargetAmount: number;
  remainingCoreNeedAmount: number | null;
  percentFunded: number;
  monthsRemaining: number | null;
  requiredMonthlyFunding: number | null;
  plannedMonthlyContribution: number | null;
  scheduleState: GoalScheduleState;
  underfundingConsequence: string | null;
  consequenceSeverity: GoalConsequenceSeverity;
  borrowingLikelihood: string | null;
  expectedBorrowingAmount: number | null;
  expectedBorrowingApr: number | null;
  debtExposure: GoalDebtExposure;
  targetReasonableness: GoalReasonableness;
  priorityBand: GoalPriorityBand;
  state: "calculated" | "more_information_needed";
  missingData: string[];
  reasonCodes: string[];
  explanations: string[];
  stableTieBreaker: string;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value
    ? null
    : result;
}

function fundingMonths(asOfDate: string, targetDate: string): number | null {
  const start = parseIsoDate(asOfDate);
  const target = parseIsoDate(targetDate);
  if (!start || !target) return null;
  if (target <= start) return 0;
  let months = (target.getUTCFullYear() - start.getUTCFullYear()) * 12
    + target.getUTCMonth() - start.getUTCMonth();
  if (target.getUTCDate() > start.getUTCDate()) months += 1;
  return Math.max(1, months);
}

function necessityOf(goal: MoneyPrioritySnapshot["goals"][number]): GoalNecessity {
  if (!goal.goalIntelligenceConfirmed) return "unknown";
  if (goal.necessity === "required") return "essential";
  if (goal.necessity === "important" || goal.necessity === "optional") return goal.necessity;
  return "unknown";
}

function flexibilityOf(goal: MoneyPrioritySnapshot["goals"][number]): GoalDeadlineFlexibility {
  if (!goal.goalIntelligenceConfirmed) return "unknown";
  if (goal.deadlineFlexibility === "somewhat_flexible") return "limited";
  if (goal.deadlineFlexibility === "fixed" || goal.deadlineFlexibility === "flexible") {
    return goal.deadlineFlexibility;
  }
  return "unknown";
}

function natureOf(goal: MoneyPrioritySnapshot["goals"][number]): GoalNature {
  if (!goal.goalIntelligenceConfirmed) return "unknown";
  return goal.goalNature === "preservation" || goal.goalNature === "improvement"
    || goal.goalNature === "mixed" ? goal.goalNature : "unknown";
}

function severityOf(goal: MoneyPrioritySnapshot["goals"][number]): GoalConsequenceSeverity {
  if (!goal.goalIntelligenceConfirmed) return "unknown";
  return goal.consequenceLevel === "critical" || goal.consequenceLevel === "high"
    || goal.consequenceLevel === "moderate" || goal.consequenceLevel === "low"
    ? goal.consequenceLevel : "unknown";
}

function debtExposureOf(
  necessity: GoalNecessity,
  likelihood: string | null,
  amount: number | null,
  apr: number | null,
): GoalDebtExposure {
  if (likelihood === "unlikely") return "none";
  if (!likelihood || likelihood === "unknown") return "unknown";
  if (likelihood === "possible") return apr !== null && apr >= 8 ? "moderate" : "low";
  if (likelihood === "likely") {
    if (necessity === "optional") return "moderate";
    if (apr === null || amount === null) return "unknown";
    return apr >= 8 || amount > 0 ? "high" : "moderate";
  }
  return "unknown";
}

function priorityOf(
  necessity: GoalNecessity,
  flexibility: GoalDeadlineFlexibility,
  severity: GoalConsequenceSeverity,
  nature: GoalNature,
): GoalPriorityBand {
  if (necessity === "unknown") return "unclassified";
  if (necessity === "optional") return nature === "improvement" ? "discretionary" : "low";
  if (necessity === "essential") return "high";
  if (severity === "critical" || severity === "high" || flexibility === "fixed"
    || (flexibility === "limited" && nature === "preservation")) return "high";
  return "medium";
}

const PRIORITY_ORDER: Record<GoalPriorityBand, number> = {
  high: 1, medium: 2, low: 3, discretionary: 4, unclassified: 5,
};
const NECESSITY_ORDER: Record<GoalNecessity, number> = {
  essential: 1, important: 2, optional: 3, unknown: 4,
};
const SEVERITY_ORDER: Record<GoalConsequenceSeverity, number> = {
  critical: 1, high: 2, moderate: 3, low: 4, unknown: 5,
};

export function compareGoalIntelligence(a: GoalIntelligenceResult, b: GoalIntelligenceResult): number {
  return PRIORITY_ORDER[a.priorityBand] - PRIORITY_ORDER[b.priorityBand]
    || NECESSITY_ORDER[a.necessity] - NECESSITY_ORDER[b.necessity]
    || SEVERITY_ORDER[a.consequenceSeverity] - SEVERITY_ORDER[b.consequenceSeverity]
    || (a.deadlineFlexibility === "fixed" ? 0 : a.deadlineFlexibility === "limited" ? 1 : 2)
      - (b.deadlineFlexibility === "fixed" ? 0 : b.deadlineFlexibility === "limited" ? 1 : 2)
    || (a.monthsRemaining ?? Number.MAX_SAFE_INTEGER) - (b.monthsRemaining ?? Number.MAX_SAFE_INTEGER)
    || a.stableTieBreaker.localeCompare(b.stableTieBreaker);
}

export function evaluateGoalIntelligence(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
): GoalIntelligenceResult[] {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");
  return snapshot.goals.map((goal): GoalIntelligenceResult => {
    const necessity = necessityOf(goal);
    const deadlineFlexibility = flexibilityOf(goal);
    const goalNature = natureOf(goal);
    const consequenceSeverity = severityOf(goal);
    const remainingTargetAmount = roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount));
    const remainingCoreNeedAmount = goal.coreNeedAmount === null
      ? null
      : roundMoney(Math.max(0, goal.coreNeedAmount - goal.currentAmount));
    const monthsRemaining = goal.targetDate ? fundingMonths(asOfDate, goal.targetDate) : null;
    const requiredMonthlyFunding = remainingTargetAmount === 0
      ? 0
      : monthsRemaining === null || monthsRemaining === 0
        ? null
        : roundMoney(remainingTargetAmount / monthsRemaining);
    const scheduleState: GoalScheduleState = remainingTargetAmount === 0
      ? "funded"
      : monthsRemaining === 0
        ? "past_due"
        : requiredMonthlyFunding === null || goal.plannedMonthlyContribution === null
          ? "more_information_needed"
          : goal.plannedMonthlyContribution >= requiredMonthlyFunding
            ? "on_track"
            : "behind";
    const targetReasonableness: GoalReasonableness = goal.coreNeedAmount === null
      ? "more_information_needed"
      : goal.coreNeedAmount < goal.targetAmount
        ? "potentially_high"
        : "reasonable";
    const debtExposure = debtExposureOf(
      necessity,
      goal.borrowingLikelihood,
      goal.expectedBorrowingAmount,
      goal.expectedBorrowingApr,
    );
    const priorityBand = priorityOf(necessity, deadlineFlexibility, consequenceSeverity, goalNature);
    const missingData: string[] = [];
    if (!goal.goalIntelligenceConfirmed) missingData.push("Confirm the goal-intelligence details; legacy defaults are not treated as user evidence.");
    if (necessity === "unknown") missingData.push("The importance of the underlying need is required.");
    if (goalNature === "unknown") missingData.push("Specify whether the goal preserves a function, improves it, or contains both.");
    if (!goal.underlyingNeed) missingData.push("Describe the underlying household need separately from the desired solution.");
    if (!goal.targetDate) missingData.push("A target date is required to calculate schedule funding.");
    if (deadlineFlexibility === "unknown") missingData.push("Deadline flexibility is required for urgency evidence.");
    if (!goal.underfundingConsequence || goal.underfundingConsequence === "unknown"
      || consequenceSeverity === "unknown") missingData.push("Describe the concrete consequence and its severity.");
    if (necessity === "essential" && goal.coreNeedAmount === null) {
      missingData.push("A core-need amount is required to distinguish the essential need from the full desired solution.");
    }
    if (goal.borrowingLikelihood === "likely"
      && (goal.expectedBorrowingAmount === null || goal.expectedBorrowingApr === null)) {
      missingData.push("Expected borrowing amount and APR are required to quantify likely financing exposure.");
    }

    const reasonCodes = [
      `necessity_${necessity}`,
      `deadline_${deadlineFlexibility}`,
      `consequence_${consequenceSeverity}`,
      `nature_${goalNature}`,
      `schedule_${scheduleState}`,
      `debt_exposure_${debtExposure}`,
      `target_${targetReasonableness}`,
      remainingTargetAmount === 0 ? "goal_fully_funded" : null,
      goal.coreNeedAmount !== null && goal.coreNeedAmount < goal.targetAmount
        ? "desired_solution_exceeds_core_need" : null,
      necessity === "optional" && goal.borrowingLikelihood === "likely"
        ? "optional_borrowing_does_not_raise_necessity" : null,
    ].filter((value): value is string => value !== null);
    const explanations = [
      necessity === "essential"
        ? "The recorded underlying need supports an essential household function."
        : necessity === "important"
          ? "The goal has meaningful household value without being classified as essential."
          : necessity === "optional"
            ? "The goal is discretionary or safely deferrable; a fixed preference date or borrowing plan does not make it essential."
            : "The underlying need has not been confirmed, so the engine does not infer importance from category.",
      goal.coreNeedAmount !== null && goal.coreNeedAmount < goal.targetAmount
        ? `$${goal.coreNeedAmount.toFixed(2)} is recorded as the core need within the $${goal.targetAmount.toFixed(2)} desired target; the difference is not automatically treated as equally necessary.`
        : "No category-based price cap or invented core amount is used.",
      remainingTargetAmount === 0
        ? "The goal is fully funded, so required monthly funding is $0.00 regardless of deadline proximity."
        : requiredMonthlyFunding !== null
          ? `The remaining $${remainingTargetAmount.toFixed(2)} requires $${requiredMonthlyFunding.toFixed(2)} per month over ${monthsRemaining} funding period${monthsRemaining === 1 ? "" : "s"}.`
          : scheduleState === "past_due"
            ? "The target date has passed with a remaining need; no divide-by-zero monthly pace is fabricated."
            : "Monthly schedule funding cannot be calculated until a usable future target date is available.",
    ];
    return {
      goalId: goal.id,
      goalName: goal.name,
      goalClass: goal.goalClass,
      underlyingNeed: goal.underlyingNeed,
      desiredSolution: goal.desiredSolution,
      necessity,
      goalNature,
      deadline: goal.targetDate,
      deadlineFlexibility,
      targetAmount: goal.targetAmount,
      coreNeedAmount: goal.coreNeedAmount,
      eligibleSavedAmount: goal.currentAmount,
      remainingTargetAmount,
      remainingCoreNeedAmount,
      percentFunded: Math.min(1, goal.currentAmount / goal.targetAmount),
      monthsRemaining,
      requiredMonthlyFunding,
      plannedMonthlyContribution: goal.plannedMonthlyContribution,
      scheduleState,
      underfundingConsequence: goal.underfundingConsequence,
      consequenceSeverity,
      borrowingLikelihood: goal.borrowingLikelihood,
      expectedBorrowingAmount: goal.expectedBorrowingAmount,
      expectedBorrowingApr: goal.expectedBorrowingApr,
      debtExposure,
      targetReasonableness,
      priorityBand,
      state: missingData.length ? "more_information_needed" : "calculated",
      missingData: [...new Set(missingData)].sort(),
      reasonCodes,
      explanations,
      stableTieBreaker: goal.id,
    };
  }).sort(compareGoalIntelligence);
}
