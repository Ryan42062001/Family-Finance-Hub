import type { ScenarioLabBootstrap } from "./scenario-app-contract.ts";
import type { ScenarioOneTimeEvent, ScenarioRecurringOverride } from "./scenario-definition.ts";

export function scenarioStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    valid: "Ready to review",
    more_information_needed: "Needs more information",
    invalid: "Could not run",
    stale_baseline: "Profile changed — update this scenario",
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
  if (relatedEntityId === "household" && category === "reserve") return "Household reserve (purpose not specified)";
  if (relatedEntityId === "household") return `Household allocation · ${category.replaceAll("_", " ")}`;
  return null;
}

type ScenarioOperation = ScenarioRecurringOverride | ScenarioOneTimeEvent;
type DisplayChange = { label: string; before: string; after: string; delta?: string };

export type ScenarioOperationPresentation = {
  title: string;
  category: string;
  changes: DisplayChange[];
  diagnosticIds: string[];
};

const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
const signedCurrency = (value: number) => `${value >= 0 ? "+" : "−"}${currency(Math.abs(value))}`;

function amountChange(label: string, before: number | null | undefined, after: number | null | undefined): DisplayChange | null {
  if (after === undefined) return null;
  if (after === null) return { label, before: before === null || before === undefined ? "Not available" : currency(before), after: "Not set" };
  if (before === null || before === undefined) return { label, before: "Not available", after: currency(after) };
  return { label, before: currency(before), after: currency(after), delta: signedCurrency(after - before) };
}

function numberChange(label: string, before: number | null | undefined, after: number | null | undefined, suffix = ""): DisplayChange | null {
  if (after === undefined) return null;
  if (after === null) return { label, before: before === null || before === undefined ? "Not available" : `${before}${suffix}`, after: "Not set" };
  const render = (value: number) => `${value}${suffix}`;
  if (before === null || before === undefined) return { label, before: "Not available", after: render(after) };
  const delta = after - before;
  return { label, before: render(before), after: render(after), delta: `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}${suffix}` };
}

function entityById(options: ScenarioLabBootstrap["entities"][keyof ScenarioLabBootstrap["entities"]], id: string) {
  return options.find((item) => item.id === id);
}

function knownOrFallback(entity: { label: string } | undefined, category: string) {
  return entity?.label ?? `${category} no longer available`;
}

export function scenarioOperationPresentation(operation: ScenarioOperation, entities: ScenarioLabBootstrap["entities"]): ScenarioOperationPresentation {
  const changes: Array<DisplayChange | null> = [];
  let title = "Scenario assumption";
  let category = "Household plan";
  const diagnosticIds = [operation.id];

  switch (operation.type) {
    case "income": {
      const entity = entityById(entities.income, operation.incomeId);
      title = knownOrFallback(entity, "Income source"); category = "Monthly income"; diagnosticIds.push(operation.incomeId);
      changes.push(amountChange("Take-home income", entity?.baseline?.monthlyTakeHomeAmount, operation.monthlyTakeHomeAmount));
      break;
    }
    case "synthetic_income":
      title = operation.name; category = "New monthly income"; diagnosticIds.push(operation.incomeId);
      changes.push({ label: "Take-home income", before: "Not included", after: currency(operation.monthlyTakeHomeAmount), delta: signedCurrency(operation.monthlyTakeHomeAmount) });
      break;
    case "expense": {
      const entity = entityById(entities.expenses, operation.expenseId);
      title = knownOrFallback(entity, "Expense"); category = "Monthly expense"; diagnosticIds.push(operation.expenseId);
      changes.push(amountChange("Monthly amount", entity?.baseline?.monthlyAmount, operation.monthlyAmount));
      break;
    }
    case "synthetic_expense":
      title = operation.name; category = "New monthly expense"; diagnosticIds.push(operation.expenseId);
      changes.push({ label: "Monthly amount", before: "Not included", after: currency(operation.monthlyAmount), delta: signedCurrency(operation.monthlyAmount) });
      break;
    case "debt": {
      const entity = entityById(entities.debts, operation.debtId);
      title = knownOrFallback(entity, "Debt"); category = "Debt changes"; diagnosticIds.push(operation.debtId);
      changes.push(amountChange("Balance", entity?.baseline?.balance, operation.balance), amountChange("Minimum payment", entity?.baseline?.minimumPayment, operation.minimumPayment), numberChange("APR", entity?.baseline?.annualInterestRate, operation.annualInterestRate, "%"));
      break;
    }
    case "goal": {
      const entity = entityById(entities.goals, operation.goalId);
      title = knownOrFallback(entity, "Financial goal"); category = "Goal changes"; diagnosticIds.push(operation.goalId);
      changes.push(amountChange("Target", entity?.baseline?.targetAmount, operation.targetAmount), amountChange("Current amount", entity?.baseline?.currentAmount, operation.currentAmount), amountChange("Monthly contribution", entity?.baseline?.plannedMonthlyContribution, operation.plannedMonthlyContribution));
      if (operation.priority !== undefined) changes.push({ label: "Priority", before: "Current profile", after: String(operation.priority) });
      if (operation.targetDate !== undefined) changes.push({ label: "Target date", before: "Current profile", after: operation.targetDate ?? "No date" });
      break;
    }
    case "retirement_account": {
      const entity = entityById(entities.retirementAccounts, operation.accountId);
      title = knownOrFallback(entity, "Retirement account"); category = "Retirement changes"; diagnosticIds.push(operation.accountId);
      changes.push(amountChange("Monthly contribution", entity?.baseline?.monthlyEmployeeContribution, operation.monthlyEmployeeContribution), amountChange("Annual target", entity?.baseline?.annualContributionTarget, operation.annualContributionTarget));
      break;
    }
    case "person_retirement_age": {
      const entity = entityById(entities.people, operation.personId);
      title = knownOrFallback(entity, "Household member"); category = "Planned retirement age"; diagnosticIds.push(operation.personId);
      changes.push(numberChange("Age", entity?.baseline?.plannedRetirementAge, operation.plannedRetirementAge));
      break;
    }
    case "insurance_exposure": {
      const entity = entityById(entities.insuranceExposures, operation.exposureId);
      title = knownOrFallback(entity, "Insurance item"); category = "Insurance changes"; diagnosticIds.push(operation.exposureId);
      changes.push(amountChange("Deductible", entity?.baseline?.deductibleAmount, operation.deductibleAmount), amountChange("Family deductible", entity?.baseline?.familyDeductibleAmount, operation.familyDeductibleAmount), amountChange("Out-of-pocket maximum", entity?.baseline?.outOfPocketMax, operation.outOfPocketMax));
      break;
    }
    case "planning_preferences":
      title = "Planning assumptions"; category = "Household preferences";
      if (operation.emergencyFundMonthsOverride !== undefined) changes.push({ label: "Emergency-fund target", before: "Current profile", after: `${operation.emergencyFundMonthsOverride} months` });
      if (operation.desiredRetirementMonthlySpending !== undefined) changes.push({ label: "Desired retirement spending", before: "Current profile", after: operation.desiredRetirementMonthlySpending === null ? "Not set" : currency(operation.desiredRetirementMonthlySpending) });
      if (operation.planningSocialSecurityMonthly !== undefined) changes.push({ label: "Planning Social Security", before: "Current profile", after: operation.planningSocialSecurityMonthly === null ? "Not set" : currency(operation.planningSocialSecurityMonthly) });
      break;
    case "cash_inflow":
      title = operation.label; category = "One-time extra money"; changes.push({ label: "Amount", before: "Not included", after: currency(operation.amount), delta: signedCurrency(operation.amount) }); break;
    case "cash_use":
      title = operation.purpose === "medical" ? "One-time medical expense" : "One-time cash use"; category = "One-time expense"; changes.push({ label: "Amount", before: "Not included", after: currency(operation.amount), delta: signedCurrency(-operation.amount) }); break;
    case "cash_funded_debt_payoff": {
      const entity = entityById(entities.debts, operation.debtId);
      title = knownOrFallback(entity, "Debt"); category = "Pay off with cash"; diagnosticIds.push(operation.debtId);
      changes.push(amountChange("Debt balance", entity?.baseline?.balance, 0)); break;
    }
    case "goal_completion": {
      const entity = entityById(entities.goals, operation.goalId);
      title = knownOrFallback(entity, "Financial goal"); category = "Mark goal complete"; diagnosticIds.push(operation.goalId);
      changes.push(amountChange("Goal amount", entity?.baseline?.currentAmount, entity?.baseline?.targetAmount)); break;
    }
  }
  return { title, category, changes: changes.filter((item): item is DisplayChange => item !== null), diagnosticIds: [...new Set(diagnosticIds)] };
}
