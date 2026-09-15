import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

/**
 * Test-only adapter for pre-Phase-5C fixtures whose legacy ranking fields were
 * intended as confirmed facts. Production normalization must remain fail-closed.
 */
export function withConfirmedLegacyGoalFacts(raw: MoneyPriorityRawSnapshot): MoneyPriorityRawSnapshot {
  const copy = structuredClone(raw);
  copy.goals = (copy.goals ?? []).map((goal) => ({
    ...goal,
    goal_intelligence_confirmed: goal.goal_intelligence_confirmed === undefined ? true : goal.goal_intelligence_confirmed,
    core_need_amount: goal.core_need_amount === undefined ? goal.target_amount : goal.core_need_amount,
    planned_monthly_contribution: goal.planned_monthly_contribution === undefined ? 0 : goal.planned_monthly_contribution,
    underlying_need: goal.underlying_need === undefined ? `${goal.name ?? goal.id} household need` : goal.underlying_need,
    desired_solution: goal.desired_solution === undefined ? `${goal.name ?? goal.id} solution` : goal.desired_solution,
    goal_nature: goal.goal_nature === undefined
      ? (goal.necessity === "optional" ? "improvement" : "preservation")
      : goal.goal_nature,
    underfunding_consequence: goal.underfunding_consequence === undefined
      ? ((goal.consequence_level === "high" || goal.consequence_level === "critical") ? "other_material" : "inconvenience")
      : goal.underfunding_consequence,
    borrowing_likelihood: goal.borrowing_likelihood === undefined ? "unlikely" : goal.borrowing_likelihood,
    expected_borrowing_amount: goal.expected_borrowing_amount === undefined ? null : goal.expected_borrowing_amount,
    expected_borrowing_apr: goal.expected_borrowing_apr === undefined ? null : goal.expected_borrowing_apr,
  }));
  return copy;
}
