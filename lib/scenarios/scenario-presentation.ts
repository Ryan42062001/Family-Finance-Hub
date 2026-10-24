import type { ScenarioLabBootstrap } from "./scenario-app-contract.ts";

export function scenarioStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    valid: "Ready to review",
    more_information_needed: "Needs more information",
    invalid: "Could not run",
    stale_baseline: "Baseline changed — rebase required",
    unauthorized: "Access required",
    feasible: "Calculation is feasible",
    infeasible: "Calculation is not feasible",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

export function refreshStateLabel(state: string): string {
  const labels: Record<string, string> = {
    current: "No material recommendation changes",
    refresh_recommended: "Review recommended",
    materially_changed: "Recommendations changed meaningfully",
    critical_change: "Major recommendation changes",
  };
  return labels[state] ?? state.replaceAll("_", " ");
}

export function capacityChange(baseline: number, scenario: number) {
  const amount = Math.round((scenario - baseline + Number.EPSILON) * 100) / 100;
  const percentage = baseline === 0 ? null : (amount / Math.abs(baseline)) * 100;
  return { amount, percentage };
}

export function allocationDisplayName(allocationId: string, entities: ScenarioLabBootstrap["entities"]): string | null {
  const parts = allocationId.split("::");
  if (parts.length !== 3) return null;
  const [, category, relatedEntityId] = parts;
  const options = [
    ...entities.debts,
    ...entities.goals,
    ...entities.retirementAccounts,
    ...entities.expenses,
    ...entities.income,
    ...entities.insuranceExposures,
    ...entities.people,
  ];
  const entity = options.find((item) => item.id === relatedEntityId);
  if (entity) return `${entity.label} · ${category.replaceAll("_", " ")}`;
  if (relatedEntityId === "household") return `Household · ${category.replaceAll("_", " ")}`;
  return null;
}
