import { moneyPrioritySnapshotToRaw } from "../calculations/money-priority-raw-adapter.ts";
import type { MoneyPriorityRawSnapshot, MoneyPrioritySnapshot } from "../calculations/money-priority-snapshot.ts";
import {
  validateScenarioDefinition,
  type ScenarioDefinition,
  type ScenarioRecurringOverride,
  type ScenarioOneTimeEvent,
  type ScenarioValidationIssue,
} from "./scenario-definition.ts";

type RawRow = Record<string, unknown>;

export type ScenarioCashProvenance = {
  inflowCents: number;
  genericUseCents: number;
  medicalUseCents: number;
  debtPayoffCents: number;
  netCashDeltaCents: number;
};

export type ScenarioOverlayProvenance = {
  recurringOverrideIds: string[];
  oneTimeEventIds: string[];
  cash: ScenarioCashProvenance;
  paidOffDebtIds: string[];
  completedGoalIds: string[];
};

export type ScenarioOverlayResult =
  | {
      ok: true;
      definition: ScenarioDefinition;
      rawSnapshot: Readonly<MoneyPriorityRawSnapshot>;
      provenance: ScenarioOverlayProvenance;
      issues: [];
    }
  | {
      ok: false;
      definition: ScenarioDefinition | null;
      rawSnapshot: null;
      provenance: null;
      issues: ScenarioValidationIssue[];
    };

function cents(value: number): number {
  return Math.round(value * 100);
}

function moneyFromCents(value: number): number {
  return value / 100;
}

function money(value: number): number {
  return moneyFromCents(cents(value));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function rowById(rows: RawRow[] | null | undefined, id: string): RawRow {
  const row = (rows ?? []).find((item) => item.id === id);
  if (!row) throw new Error("Validated scenario entity " + id + " disappeared during overlay application.");
  return row;
}

function setIfPresent(raw: RawRow, source: Record<string, unknown>, sourceKey: string, rawKey: string, monetary = false): void {
  if (!Object.prototype.hasOwnProperty.call(source, sourceKey)) return;
  const value = source[sourceKey];
  raw[rawKey] = monetary && typeof value === "number" ? money(value) : value;
}

function applyRecurring(raw: MoneyPriorityRawSnapshot, override: ScenarioRecurringOverride): void {
  const source = override as unknown as Record<string, unknown>;
  switch (override.type) {
    case "income": {
      const row = rowById(raw.income, override.incomeId);
      setIfPresent(row, source, "monthlyTakeHomeAmount", "monthly_amount", true);
      setIfPresent(row, source, "monthlyGrossAmount", "monthly_gross_amount", true);
      setIfPresent(row, source, "isActive", "is_active");
      return;
    }
    case "synthetic_income":
      (raw.income ??= []).push({
        id: override.incomeId,
        owner_person_id: override.ownerPersonId,
        name: override.name,
        income_type: override.incomeType,
        monthly_amount: money(override.monthlyTakeHomeAmount),
        monthly_gross_amount: override.monthlyGrossAmount === null ? null : money(override.monthlyGrossAmount),
        is_variable: override.isVariable,
        is_active: override.isActive,
      });
      return;
    case "expense": {
      const row = rowById(raw.expenses, override.expenseId);
      setIfPresent(row, source, "monthlyAmount", "monthly_amount", true);
      setIfPresent(row, source, "isEssential", "is_essential");
      setIfPresent(row, source, "cashFlowTreatment", "cash_flow_treatment");
      return;
    }
    case "synthetic_expense":
      (raw.expenses ??= []).push({
        id: override.expenseId,
        name: override.name,
        category: override.category,
        monthly_amount: money(override.monthlyAmount),
        is_essential: override.isEssential,
        cash_flow_treatment: override.cashFlowTreatment,
      });
      return;
    case "debt": {
      const row = rowById(raw.debts, override.debtId);
      setIfPresent(row, source, "balance", "current_balance", true);
      setIfPresent(row, source, "minimumPayment", "minimum_payment", true);
      setIfPresent(row, source, "annualInterestRate", "interest_rate");
      setIfPresent(row, source, "isPastDue", "is_past_due");
      setIfPresent(row, source, "isInCollections", "is_in_collections");
      return;
    }
    case "goal": {
      const row = rowById(raw.goals, override.goalId);
      setIfPresent(row, source, "targetAmount", "target_amount", true);
      setIfPresent(row, source, "currentAmount", "current_amount", true);
      setIfPresent(row, source, "targetDate", "target_date");
      setIfPresent(row, source, "priority", "priority");
      setIfPresent(row, source, "plannedMonthlyContribution", "planned_monthly_contribution", true);
      return;
    }
    case "retirement_account": {
      const row = rowById(raw.retirementAccounts, override.accountId);
      setIfPresent(row, source, "monthlyEmployeeContribution", "monthly_employee_contribution", true);
      setIfPresent(row, source, "annualContributionTarget", "annual_contribution_target", true);
      return;
    }
    case "person_retirement_age": {
      const row = rowById(raw.people, override.personId);
      row.planned_retirement_age = override.plannedRetirementAge;
      return;
    }
    case "insurance_exposure": {
      const row = rowById(raw.insuranceExposures, override.exposureId);
      setIfPresent(row, source, "deductibleAmount", "deductible_amount", true);
      setIfPresent(row, source, "familyDeductibleAmount", "family_deductible_amount", true);
      setIfPresent(row, source, "outOfPocketMax", "out_of_pocket_max", true);
      setIfPresent(row, source, "percentageDeductible", "percentage_deductible");
      setIfPresent(row, source, "insuredValue", "insured_value", true);
      setIfPresent(row, source, "isRelevantToReserve", "is_relevant_to_reserve");
      return;
    }
    case "planning_preferences": {
      if (!raw.preferences) throw new Error("Validated scenario preferences disappeared during overlay application.");
      setIfPresent(raw.preferences, source, "emergencyFundMonthsOverride", "emergency_fund_months_override");
      setIfPresent(raw.preferences, source, "knownIncomeDisruption", "known_income_disruption");
      setIfPresent(raw.preferences, source, "knownIncomeDisruptionEndDate", "known_income_disruption_end_date");
      setIfPresent(raw.preferences, source, "desiredRetirementMonthlySpending", "desired_retirement_monthly_spending", true);
      setIfPresent(raw.preferences, source, "planningSocialSecurityMonthly", "planning_social_security_monthly", true);
      setIfPresent(raw.preferences, source, "planningPensionMonthly", "planning_pension_monthly", true);
      setIfPresent(raw.preferences, source, "expectedHsaMedicalSpendingAnnual", "expected_hsa_medical_spending_annual", true);
      return;
    }
  }
}

function consumeEligibleCash(
  raw: MoneyPriorityRawSnapshot,
  requestedCents: number,
  relatedGoalId: string | null,
  relatedDebtId: string | null,
): number {
  let remaining = requestedCents;
  const accounts = raw.accounts ?? [];
  const eligible = accounts
    .filter((account) => {
      const balance = typeof account.balance === "number" ? cents(account.balance) : 0;
      if (balance <= 0) return false;
      if (account.cash_purpose === "unallocated") return true;
      if (relatedGoalId !== null && account.cash_purpose === "earmarked_goal" && account.related_goal_id === relatedGoalId) return true;
      return relatedDebtId !== null && account.cash_purpose === "debt_backed_reserve" && account.related_debt_id === relatedDebtId;
    })
    .sort((a, b) => {
      const aSpecific = a.cash_purpose === "unallocated" ? 1 : 0;
      const bSpecific = b.cash_purpose === "unallocated" ? 1 : 0;
      return aSpecific - bSpecific || String(a.id).localeCompare(String(b.id));
    });

  for (const account of eligible) {
    if (remaining <= 0) break;
    const balanceCents = cents(Number(account.balance));
    const used = Math.min(balanceCents, remaining);
    account.balance = moneyFromCents(balanceCents - used);
    remaining -= used;
  }
  return requestedCents - remaining;
}

function applyInflow(raw: MoneyPriorityRawSnapshot, scenarioId: string, event: Extract<ScenarioOneTimeEvent, { type: "cash_inflow" }>): number {
  const amountCents = cents(event.amount);
  (raw.accounts ??= []).push({
    id: "scenario:" + scenarioId + ":cash-inflow:" + event.id,
    name: event.label,
    account_type: "checking",
    balance: moneyFromCents(amountCents),
    cash_purpose: "unallocated",
    related_goal_id: null,
    related_debt_id: null,
  });
  return amountCents;
}

export function applyScenarioOverlay(baseline: MoneyPrioritySnapshot, input: unknown): ScenarioOverlayResult {
  const validation = validateScenarioDefinition(input, baseline);
  if (!validation.valid || !validation.definition) {
    return { ok: false, definition: null, rawSnapshot: null, provenance: null, issues: validation.issues };
  }
  const definition = validation.definition;
  if (definition.specializedIntent) {
    return {
      ok: false,
      definition,
      rawSnapshot: null,
      provenance: null,
      issues: [{
        path: "scenario.specializedIntent",
        code: "unsupported_specialized_intent",
        message: "FFH-040 defines the specialized-intent boundary but does not execute Home, Vehicle, or Windfall adapters.",
      }],
    };
  }

  const raw = moneyPrioritySnapshotToRaw(baseline);
  const recurring = [...definition.recurringOverrides].sort((a, b) =>
    (a.type + ":" + a.id).localeCompare(b.type + ":" + b.id));
  const events = [...definition.oneTimeEvents].sort((a, b) =>
    (a.type + ":" + a.id).localeCompare(b.type + ":" + b.id));

  for (const override of recurring) applyRecurring(raw, override);

  let inflowCents = 0;
  let genericUseCents = 0;
  let medicalUseCents = 0;
  let debtPayoffCents = 0;
  const paidOffDebtIds: string[] = [];
  const completedGoalIds: string[] = [];

  for (const event of events.filter((item) => item.type === "cash_inflow")) {
    inflowCents += applyInflow(raw, definition.scenarioId, event as Extract<ScenarioOneTimeEvent, { type: "cash_inflow" }>);
  }

  for (const event of events.filter((item) => item.type === "goal_completion")) {
    const goalEvent = event as Extract<ScenarioOneTimeEvent, { type: "goal_completion" }>;
    const goal = rowById(raw.goals, goalEvent.goalId);
    goal.current_amount = goal.target_amount;
    completedGoalIds.push(goalEvent.goalId);
  }

  const outflows = events.filter((item) => item.type === "cash_use" || item.type === "cash_funded_debt_payoff");
  for (const event of outflows) {
    if (event.type === "cash_use") {
      const requested = cents(event.amount);
      const used = consumeEligibleCash(raw, requested, event.relatedGoalId ?? null, null);
      if (used !== requested) {
        return {
          ok: false,
          definition,
          rawSnapshot: null,
          provenance: null,
          issues: [{
            path: "scenario.oneTimeEvents." + event.id,
            code: "conflicting_operation",
            message: "One-time cash use exceeds eligible unallocated/related-goal cash; no partial use was applied.",
          }],
        };
      }
      if (event.purpose === "medical") medicalUseCents += used;
      else genericUseCents += used;
      continue;
    }

    const debt = rowById(raw.debts, event.debtId);
    const payoffCents = cents(Number(debt.current_balance));
    if (payoffCents <= 0) {
      return {
        ok: false,
        definition,
        rawSnapshot: null,
        provenance: null,
        issues: [{
          path: "scenario.oneTimeEvents." + event.id,
          code: "conflicting_operation",
          message: "Cash-funded debt payoff requires a positive remaining debt balance.",
        }],
      };
    }
    const used = consumeEligibleCash(raw, payoffCents, null, event.debtId);
    if (used !== payoffCents) {
      return {
        ok: false,
        definition,
        rawSnapshot: null,
        provenance: null,
        issues: [{
          path: "scenario.oneTimeEvents." + event.id,
          code: "conflicting_operation",
          message: "Cash-funded debt payoff requires enough eligible unallocated or debt-backed cash to retire the balance atomically.",
        }],
      };
    }
    debt.current_balance = 0;
    debt.minimum_payment = 0;
    if (debt.current_required_monthly_payment !== null && debt.current_required_monthly_payment !== undefined) {
      debt.current_required_monthly_payment = 0;
    }
    debtPayoffCents += payoffCents;
    paidOffDebtIds.push(event.debtId);
  }

  const provenance: ScenarioOverlayProvenance = {
    recurringOverrideIds: recurring.map((item) => item.id),
    oneTimeEventIds: events.map((item) => item.id),
    cash: {
      inflowCents,
      genericUseCents,
      medicalUseCents,
      debtPayoffCents,
      netCashDeltaCents: inflowCents - genericUseCents - medicalUseCents - debtPayoffCents,
    },
    paidOffDebtIds: [...paidOffDebtIds].sort(),
    completedGoalIds: [...completedGoalIds].sort(),
  };

  return {
    ok: true,
    definition,
    rawSnapshot: deepFreeze(raw) as Readonly<MoneyPriorityRawSnapshot>,
    provenance,
    issues: [],
  };
}
