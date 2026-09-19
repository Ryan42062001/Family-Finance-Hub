import type { MoneyPrioritySnapshot } from "../calculations/money-priority-snapshot.ts";

export const SCENARIO_DEFINITION_VERSION = "scenario-definition-v1" as const;

export type ScenarioBaselineReference = {
  fingerprint: string | null;
  referenceId: string | null;
};

export type ScenarioSpecializedIntent = {
  type: "home" | "vehicle" | "windfall";
  intentId: string;
};

export type ExistingIncomeOverride = {
  type: "income";
  id: string;
  incomeId: string;
  monthlyTakeHomeAmount?: number;
  monthlyGrossAmount?: number | null;
  isActive?: boolean;
};

export type SyntheticIncomeOverride = {
  type: "synthetic_income";
  id: string;
  incomeId: string;
  name: string;
  incomeType: string;
  ownerPersonId: string | null;
  monthlyTakeHomeAmount: number;
  monthlyGrossAmount: number | null;
  isVariable: boolean;
  isActive: boolean;
};

export type ExistingExpenseOverride = {
  type: "expense";
  id: string;
  expenseId: string;
  monthlyAmount?: number;
  isEssential?: boolean;
  cashFlowTreatment?: "required" | "discretionary";
};

export type SyntheticExpenseOverride = {
  type: "synthetic_expense";
  id: string;
  expenseId: string;
  name: string;
  category: string;
  monthlyAmount: number;
  isEssential: boolean;
  cashFlowTreatment: "required" | "discretionary";
};

export type DebtOverride = {
  type: "debt";
  id: string;
  debtId: string;
  balance?: number;
  minimumPayment?: number;
  annualInterestRate?: number | null;
  isPastDue?: boolean;
  isInCollections?: boolean;
};

export type GoalOverride = {
  type: "goal";
  id: string;
  goalId: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string | null;
  priority?: number;
  plannedMonthlyContribution?: number | null;
};

export type RetirementAccountPlanningOverride = {
  type: "retirement_account";
  id: string;
  accountId: string;
  monthlyEmployeeContribution?: number;
  annualContributionTarget?: number | null;
};

export type PersonRetirementAgeOverride = {
  type: "person_retirement_age";
  id: string;
  personId: string;
  plannedRetirementAge: number | null;
};

export type InsuranceExposureOverride = {
  type: "insurance_exposure";
  id: string;
  exposureId: string;
  deductibleAmount?: number | null;
  familyDeductibleAmount?: number | null;
  outOfPocketMax?: number | null;
  percentageDeductible?: number | null;
  insuredValue?: number | null;
  isRelevantToReserve?: boolean;
};

export type PlanningPreferenceOverride = {
  type: "planning_preferences";
  id: string;
  emergencyFundMonthsOverride?: number | null;
  knownIncomeDisruption?: boolean;
  knownIncomeDisruptionEndDate?: string | null;
  desiredRetirementMonthlySpending?: number | null;
  planningSocialSecurityMonthly?: number | null;
  planningPensionMonthly?: number | null;
  expectedHsaMedicalSpendingAnnual?: number | null;
};

export type ScenarioRecurringOverride =
  | ExistingIncomeOverride
  | SyntheticIncomeOverride
  | ExistingExpenseOverride
  | SyntheticExpenseOverride
  | DebtOverride
  | GoalOverride
  | RetirementAccountPlanningOverride
  | PersonRetirementAgeOverride
  | InsuranceExposureOverride
  | PlanningPreferenceOverride;

export type CashInflowEvent = {
  type: "cash_inflow";
  id: string;
  amount: number;
  label: string;
};

export type CashUseEvent = {
  type: "cash_use";
  id: string;
  amount: number;
  relatedGoalId?: string | null;
  purpose: "generic" | "medical";
};

export type CashFundedDebtPayoffEvent = {
  type: "cash_funded_debt_payoff";
  id: string;
  debtId: string;
};

export type GoalCompletionEvent = {
  type: "goal_completion";
  id: string;
  goalId: string;
};

export type ScenarioOneTimeEvent =
  | CashInflowEvent
  | CashUseEvent
  | CashFundedDebtPayoffEvent
  | GoalCompletionEvent;

export type ScenarioDefinition = {
  version: typeof SCENARIO_DEFINITION_VERSION;
  scenarioId: string;
  baselineReference: ScenarioBaselineReference;
  recurringOverrides: ScenarioRecurringOverride[];
  oneTimeEvents: ScenarioOneTimeEvent[];
  specializedIntent?: ScenarioSpecializedIntent | null;
};

export type ScenarioValidationIssueCode =
  | "invalid_definition"
  | "invalid_version"
  | "unknown_field"
  | "protected_field"
  | "unknown_operation_type"
  | "duplicate_operation_id"
  | "duplicate_target"
  | "conflicting_operation"
  | "missing_entity"
  | "duplicate_entity_id"
  | "invalid_number"
  | "invalid_boolean"
  | "invalid_date"
  | "invalid_enum"
  | "invalid_string"
  | "unsupported_specialized_intent";

export type ScenarioValidationIssue = {
  path: string;
  code: ScenarioValidationIssueCode;
  message: string;
};

export type ScenarioValidationResult = {
  valid: boolean;
  issues: ScenarioValidationIssue[];
  definition: ScenarioDefinition | null;
};

type Row = Record<string, unknown>;

const PROTECTED_FIELDS = new Set([
  "hsaEligible", "hsa_eligible", "hsaCoverageType", "hsa_coverage_type",
  "hsaYtdTaxYear", "hsa_ytd_tax_year", "employeeContributedYtd", "employee_contributed_ytd",
  "employerContributedYtd", "employer_contributed_ytd", "simplePlanLimitCategory",
  "simple_plan_limit_category", "simplePlanLimitTaxYear", "simple_plan_limit_tax_year",
  "estimatedTaxableCompensationAnnual", "estimated_taxable_compensation_annual",
  "planEligibleCompensationAnnual", "plan_eligible_compensation_annual",
  "sepEligibleCompensationAnnual", "sep_eligible_compensation_annual",
  "taxProfileYear", "tax_profile_year", "taxFilingStatus", "tax_filing_status",
  "estimatedModifiedAgi", "estimated_modified_agi", "livedWithSpouseDuringTaxYear",
  "lived_with_spouse_during_tax_year", "policyVersion", "taxPolicyVersion",
  "moneyPriorityPolicyVersion", "planningAssumptionsVersion",
  "hsaLegalSpouseAuthorities", "hsaMonthStatuses", "hsaTaxYearProfiles",
  "lastMonthRuleStatus", "testingPeriodStatus",
]);

function record(value: unknown): value is Row {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-").map(Number);
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime())
    && date.getUTCFullYear() === parts[0]
    && date.getUTCMonth() + 1 === parts[1]
    && date.getUTCDate() === parts[2];
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function rejectUnknownKeys(value: Row, allowed: readonly string[], path: string, issues: ScenarioValidationIssue[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (allowedSet.has(key)) continue;
    const protectedField = PROTECTED_FIELDS.has(key);
    issues.push({
      path: path + "." + key,
      code: protectedField ? "protected_field" : "unknown_field",
      message: protectedField
        ? key + " is a protected legal/statutory field and cannot be changed by a generic scenario."
        : key + " is not supported by this scenario operation.",
    });
  }
}

function requireString(value: unknown, path: string, issues: ScenarioValidationIssue[]): void {
  if (!nonemptyString(value)) issues.push({ path, code: "invalid_string", message: path + " must be a nonempty string." });
}

function money(value: unknown, path: string, issues: ScenarioValidationIssue[], nullable = false): void {
  if (nullable && value === null) return;
  if (!finiteNumber(value) || value < 0) {
    issues.push({ path, code: "invalid_number", message: path + " must be a finite nonnegative number" + (nullable ? " or null." : ".") });
  }
}

function booleanValue(value: unknown, path: string, issues: ScenarioValidationIssue[]): void {
  if (typeof value !== "boolean") issues.push({ path, code: "invalid_boolean", message: path + " must be true or false." });
}

function nullableDate(value: unknown, path: string, issues: ScenarioValidationIssue[]): void {
  if (value !== null && !isoDate(value)) issues.push({ path, code: "invalid_date", message: path + " must be null or a real YYYY-MM-DD date." });
}

function has(value: Row, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function validateScenarioDefinition(input: unknown, baseline: MoneyPrioritySnapshot): ScenarioValidationResult {
  const issues: ScenarioValidationIssue[] = [];
  if (!record(input)) {
    return { valid: false, issues: [{ path: "scenario", code: "invalid_definition", message: "Scenario definition must be an object." }], definition: null };
  }

  rejectUnknownKeys(input, ["version", "scenarioId", "baselineReference", "recurringOverrides", "oneTimeEvents", "specializedIntent"], "scenario", issues);
  if (input.version !== SCENARIO_DEFINITION_VERSION) {
    issues.push({ path: "scenario.version", code: "invalid_version", message: "Unsupported ScenarioDefinition version." });
  }
  requireString(input.scenarioId, "scenario.scenarioId", issues);

  if (!record(input.baselineReference)) {
    issues.push({ path: "scenario.baselineReference", code: "invalid_definition", message: "baselineReference must be an object." });
  } else {
    rejectUnknownKeys(input.baselineReference, ["fingerprint", "referenceId"], "scenario.baselineReference", issues);
    if (input.baselineReference.fingerprint !== null && !nonemptyString(input.baselineReference.fingerprint)) {
      issues.push({ path: "scenario.baselineReference.fingerprint", code: "invalid_string", message: "fingerprint must be null or a nonempty opaque string." });
    }
    if (input.baselineReference.referenceId !== null && !nonemptyString(input.baselineReference.referenceId)) {
      issues.push({ path: "scenario.baselineReference.referenceId", code: "invalid_string", message: "referenceId must be null or a nonempty opaque string." });
    }
  }

  if (!Array.isArray(input.recurringOverrides)) {
    issues.push({ path: "scenario.recurringOverrides", code: "invalid_definition", message: "recurringOverrides must be an array." });
  }
  if (!Array.isArray(input.oneTimeEvents)) {
    issues.push({ path: "scenario.oneTimeEvents", code: "invalid_definition", message: "oneTimeEvents must be an array." });
  }

  if (input.specializedIntent !== undefined && input.specializedIntent !== null) {
    if (!record(input.specializedIntent)) {
      issues.push({ path: "scenario.specializedIntent", code: "invalid_definition", message: "specializedIntent must be null or an object." });
    } else {
      rejectUnknownKeys(input.specializedIntent, ["type", "intentId"], "scenario.specializedIntent", issues);
      if (!["home", "vehicle", "windfall"].includes(String(input.specializedIntent.type))) {
        issues.push({ path: "scenario.specializedIntent.type", code: "invalid_enum", message: "specializedIntent.type must be home, vehicle, or windfall." });
      }
      requireString(input.specializedIntent.intentId, "scenario.specializedIntent.intentId", issues);
    }
  }

  const operationIds = new Set<string>();
  const targets = new Set<string>();
  const recurringTargets = new Set<string>();
  const payoffTargets = new Set<string>();
  const completedGoalTargets = new Set<string>();

  const ids = {
    people: new Set(baseline.people.map((item) => item.id)),
    income: new Set(baseline.income.map((item) => item.id)),
    expenses: new Set(baseline.expenses.map((item) => item.id)),
    debts: new Set(baseline.debts.map((item) => item.id)),
    goals: new Set(baseline.goals.map((item) => item.id)),
    retirement: new Set(baseline.retirementAccounts.map((item) => item.id)),
    insurance: new Set(baseline.insuranceExposures.map((item) => item.id)),
  };

  const registerOperation = (value: Row, path: string): void => {
    requireString(value.id, path + ".id", issues);
    if (!nonemptyString(value.id)) return;
    if (operationIds.has(value.id)) {
      issues.push({ path: path + ".id", code: "duplicate_operation_id", message: "Scenario operation IDs must be unique." });
    }
    operationIds.add(value.id);
  };

  const requireTarget = (id: unknown, set: Set<string>, path: string): string | null => {
    if (!nonemptyString(id)) {
      issues.push({ path, code: "invalid_string", message: path + " must be a nonempty stable entity ID." });
      return null;
    }
    if (!set.has(id)) {
      issues.push({ path, code: "missing_entity", message: "Scenario target " + id + " does not exist in the baseline snapshot." });
      return null;
    }
    return id;
  };

  const registerTarget = (key: string, path: string): void => {
    if (targets.has(key)) issues.push({ path, code: "duplicate_target", message: "Duplicate/conflicting scenario overrides for " + key + " are not allowed." });
    targets.add(key);
    recurringTargets.add(key);
  };

  const recurring = Array.isArray(input.recurringOverrides) ? input.recurringOverrides : [];
  recurring.forEach((raw, index) => {
    const path = "scenario.recurringOverrides[" + index + "]";
    if (!record(raw)) {
      issues.push({ path, code: "invalid_definition", message: "Recurring override must be an object." });
      return;
    }
    registerOperation(raw, path);
    const type = raw.type;

    if (type === "income") {
      rejectUnknownKeys(raw, ["type", "id", "incomeId", "monthlyTakeHomeAmount", "monthlyGrossAmount", "isActive"], path, issues);
      const target = requireTarget(raw.incomeId, ids.income, path + ".incomeId");
      if (target) registerTarget("income:" + target, path);
      if (![has(raw, "monthlyTakeHomeAmount"), has(raw, "monthlyGrossAmount"), has(raw, "isActive")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Income override must change at least one supported field." });
      }
      if (has(raw, "monthlyTakeHomeAmount")) money(raw.monthlyTakeHomeAmount, path + ".monthlyTakeHomeAmount", issues);
      if (has(raw, "monthlyGrossAmount")) money(raw.monthlyGrossAmount, path + ".monthlyGrossAmount", issues, true);
      if (has(raw, "isActive")) booleanValue(raw.isActive, path + ".isActive", issues);
      return;
    }

    if (type === "synthetic_income") {
      rejectUnknownKeys(raw, ["type", "id", "incomeId", "name", "incomeType", "ownerPersonId", "monthlyTakeHomeAmount", "monthlyGrossAmount", "isVariable", "isActive"], path, issues);
      requireString(raw.incomeId, path + ".incomeId", issues);
      if (nonemptyString(raw.incomeId)) {
        registerTarget("income:" + raw.incomeId, path);
        if (ids.income.has(raw.incomeId)) issues.push({ path: path + ".incomeId", code: "duplicate_entity_id", message: "Synthetic income ID collides with a baseline income ID." });
      }
      requireString(raw.name, path + ".name", issues);
      requireString(raw.incomeType, path + ".incomeType", issues);
      if (raw.ownerPersonId !== null) requireTarget(raw.ownerPersonId, ids.people, path + ".ownerPersonId");
      money(raw.monthlyTakeHomeAmount, path + ".monthlyTakeHomeAmount", issues);
      money(raw.monthlyGrossAmount, path + ".monthlyGrossAmount", issues, true);
      booleanValue(raw.isVariable, path + ".isVariable", issues);
      booleanValue(raw.isActive, path + ".isActive", issues);
      return;
    }

    if (type === "expense") {
      rejectUnknownKeys(raw, ["type", "id", "expenseId", "monthlyAmount", "isEssential", "cashFlowTreatment"], path, issues);
      const target = requireTarget(raw.expenseId, ids.expenses, path + ".expenseId");
      if (target) registerTarget("expense:" + target, path);
      if (![has(raw, "monthlyAmount"), has(raw, "isEssential"), has(raw, "cashFlowTreatment")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Expense override must change at least one supported field." });
      }
      if (has(raw, "monthlyAmount")) money(raw.monthlyAmount, path + ".monthlyAmount", issues);
      if (has(raw, "isEssential")) booleanValue(raw.isEssential, path + ".isEssential", issues);
      if (has(raw, "cashFlowTreatment") && !["required", "discretionary"].includes(String(raw.cashFlowTreatment))) {
        issues.push({ path: path + ".cashFlowTreatment", code: "invalid_enum", message: "cashFlowTreatment must be required or discretionary." });
      }
      return;
    }

    if (type === "synthetic_expense") {
      rejectUnknownKeys(raw, ["type", "id", "expenseId", "name", "category", "monthlyAmount", "isEssential", "cashFlowTreatment"], path, issues);
      requireString(raw.expenseId, path + ".expenseId", issues);
      if (nonemptyString(raw.expenseId)) {
        registerTarget("expense:" + raw.expenseId, path);
        if (ids.expenses.has(raw.expenseId)) issues.push({ path: path + ".expenseId", code: "duplicate_entity_id", message: "Synthetic expense ID collides with a baseline expense ID." });
      }
      requireString(raw.name, path + ".name", issues);
      requireString(raw.category, path + ".category", issues);
      money(raw.monthlyAmount, path + ".monthlyAmount", issues);
      booleanValue(raw.isEssential, path + ".isEssential", issues);
      if (!["required", "discretionary"].includes(String(raw.cashFlowTreatment))) {
        issues.push({ path: path + ".cashFlowTreatment", code: "invalid_enum", message: "cashFlowTreatment must be required or discretionary." });
      }
      return;
    }

    if (type === "debt") {
      rejectUnknownKeys(raw, ["type", "id", "debtId", "balance", "minimumPayment", "annualInterestRate", "isPastDue", "isInCollections"], path, issues);
      const target = requireTarget(raw.debtId, ids.debts, path + ".debtId");
      if (target) registerTarget("debt:" + target, path);
      if (![has(raw, "balance"), has(raw, "minimumPayment"), has(raw, "annualInterestRate"), has(raw, "isPastDue"), has(raw, "isInCollections")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Debt override must change at least one supported field." });
      }
      if (has(raw, "balance")) money(raw.balance, path + ".balance", issues);
      if (has(raw, "minimumPayment")) money(raw.minimumPayment, path + ".minimumPayment", issues);
      if (has(raw, "annualInterestRate")) {
        money(raw.annualInterestRate, path + ".annualInterestRate", issues, true);
        if (finiteNumber(raw.annualInterestRate) && raw.annualInterestRate > 100) issues.push({ path: path + ".annualInterestRate", code: "invalid_number", message: "APR cannot exceed 100 percent." });
      }
      if (has(raw, "isPastDue")) booleanValue(raw.isPastDue, path + ".isPastDue", issues);
      if (has(raw, "isInCollections")) booleanValue(raw.isInCollections, path + ".isInCollections", issues);
      return;
    }

    if (type === "goal") {
      rejectUnknownKeys(raw, ["type", "id", "goalId", "targetAmount", "currentAmount", "targetDate", "priority", "plannedMonthlyContribution"], path, issues);
      const target = requireTarget(raw.goalId, ids.goals, path + ".goalId");
      if (target) registerTarget("goal:" + target, path);
      if (![has(raw, "targetAmount"), has(raw, "currentAmount"), has(raw, "targetDate"), has(raw, "priority"), has(raw, "plannedMonthlyContribution")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Goal override must change at least one supported field." });
      }
      if (has(raw, "targetAmount")) {
        if (!finiteNumber(raw.targetAmount) || raw.targetAmount <= 0) issues.push({ path: path + ".targetAmount", code: "invalid_number", message: "Goal targetAmount must be a finite positive amount." });
      }
      if (has(raw, "currentAmount")) money(raw.currentAmount, path + ".currentAmount", issues);
      if (has(raw, "targetDate")) nullableDate(raw.targetDate, path + ".targetDate", issues);
      if (has(raw, "priority") && (!Number.isInteger(raw.priority) || Number(raw.priority) < 1 || Number(raw.priority) > 5)) {
        issues.push({ path: path + ".priority", code: "invalid_number", message: "Goal priority must be an integer from 1 through 5." });
      }
      if (has(raw, "plannedMonthlyContribution")) money(raw.plannedMonthlyContribution, path + ".plannedMonthlyContribution", issues, true);
      if (target) {
        const base = baseline.goals.find((item) => item.id === target)!;
        const candidateTarget = finiteNumber(raw.targetAmount) ? raw.targetAmount : base.targetAmount;
        const candidateCurrent = finiteNumber(raw.currentAmount) ? raw.currentAmount : base.currentAmount;
        if (candidateCurrent > candidateTarget) issues.push({ path, code: "invalid_number", message: "Goal currentAmount cannot exceed targetAmount." });
      }
      return;
    }

    if (type === "retirement_account") {
      rejectUnknownKeys(raw, ["type", "id", "accountId", "monthlyEmployeeContribution", "annualContributionTarget"], path, issues);
      const target = requireTarget(raw.accountId, ids.retirement, path + ".accountId");
      if (target) registerTarget("retirement:" + target, path);
      if (![has(raw, "monthlyEmployeeContribution"), has(raw, "annualContributionTarget")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Retirement-account override must change a supported planning field." });
      }
      if (has(raw, "monthlyEmployeeContribution")) money(raw.monthlyEmployeeContribution, path + ".monthlyEmployeeContribution", issues);
      if (has(raw, "annualContributionTarget")) money(raw.annualContributionTarget, path + ".annualContributionTarget", issues, true);
      return;
    }

    if (type === "person_retirement_age") {
      rejectUnknownKeys(raw, ["type", "id", "personId", "plannedRetirementAge"], path, issues);
      const target = requireTarget(raw.personId, ids.people, path + ".personId");
      if (target) registerTarget("person:" + target, path);
      if (raw.plannedRetirementAge !== null && (!Number.isInteger(raw.plannedRetirementAge) || Number(raw.plannedRetirementAge) < 40 || Number(raw.plannedRetirementAge) > 100)) {
        issues.push({ path: path + ".plannedRetirementAge", code: "invalid_number", message: "plannedRetirementAge must be null or an integer from 40 through 100." });
      }
      return;
    }

    if (type === "insurance_exposure") {
      rejectUnknownKeys(raw, ["type", "id", "exposureId", "deductibleAmount", "familyDeductibleAmount", "outOfPocketMax", "percentageDeductible", "insuredValue", "isRelevantToReserve"], path, issues);
      const target = requireTarget(raw.exposureId, ids.insurance, path + ".exposureId");
      if (target) registerTarget("insurance:" + target, path);
      if (![has(raw, "deductibleAmount"), has(raw, "familyDeductibleAmount"), has(raw, "outOfPocketMax"), has(raw, "percentageDeductible"), has(raw, "insuredValue"), has(raw, "isRelevantToReserve")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Insurance override must change at least one supported field." });
      }
      for (const field of ["deductibleAmount", "familyDeductibleAmount", "outOfPocketMax", "insuredValue"]) {
        if (has(raw, field)) money(raw[field], path + "." + field, issues, true);
      }
      if (has(raw, "percentageDeductible")) {
        money(raw.percentageDeductible, path + ".percentageDeductible", issues, true);
        if (finiteNumber(raw.percentageDeductible) && raw.percentageDeductible > 1) issues.push({ path: path + ".percentageDeductible", code: "invalid_number", message: "percentageDeductible cannot exceed 1." });
      }
      if (has(raw, "isRelevantToReserve")) booleanValue(raw.isRelevantToReserve, path + ".isRelevantToReserve", issues);
      return;
    }

    if (type === "planning_preferences") {
      rejectUnknownKeys(raw, ["type", "id", "emergencyFundMonthsOverride", "knownIncomeDisruption", "knownIncomeDisruptionEndDate", "desiredRetirementMonthlySpending", "planningSocialSecurityMonthly", "planningPensionMonthly", "expectedHsaMedicalSpendingAnnual"], path, issues);
      registerTarget("preferences:household", path);
      if (baseline.preferences === null) issues.push({ path, code: "missing_entity", message: "Baseline planning preferences are absent; a generic scenario cannot fabricate the rest of that preference contract." });
      if (![has(raw, "emergencyFundMonthsOverride"), has(raw, "knownIncomeDisruption"), has(raw, "knownIncomeDisruptionEndDate"), has(raw, "desiredRetirementMonthlySpending"), has(raw, "planningSocialSecurityMonthly"), has(raw, "planningPensionMonthly"), has(raw, "expectedHsaMedicalSpendingAnnual")].some(Boolean)) {
        issues.push({ path, code: "invalid_definition", message: "Planning-preference override must change at least one supported non-statutory field." });
      }
      if (has(raw, "emergencyFundMonthsOverride")) {
        if (raw.emergencyFundMonthsOverride !== null && (!finiteNumber(raw.emergencyFundMonthsOverride) || raw.emergencyFundMonthsOverride < 1 || raw.emergencyFundMonthsOverride > 12)) issues.push({ path: path + ".emergencyFundMonthsOverride", code: "invalid_number", message: "emergencyFundMonthsOverride must be null or between 1 and 12." });
      }
      if (has(raw, "knownIncomeDisruption")) booleanValue(raw.knownIncomeDisruption, path + ".knownIncomeDisruption", issues);
      if (has(raw, "knownIncomeDisruptionEndDate")) nullableDate(raw.knownIncomeDisruptionEndDate, path + ".knownIncomeDisruptionEndDate", issues);
      for (const field of ["desiredRetirementMonthlySpending", "planningSocialSecurityMonthly", "planningPensionMonthly", "expectedHsaMedicalSpendingAnnual"]) {
        if (has(raw, field)) money(raw[field], path + "." + field, issues, true);
      }
      return;
    }

    issues.push({ path: path + ".type", code: "unknown_operation_type", message: "Unknown recurring scenario override type." });
  });

  const events = Array.isArray(input.oneTimeEvents) ? input.oneTimeEvents : [];
  events.forEach((raw, index) => {
    const path = "scenario.oneTimeEvents[" + index + "]";
    if (!record(raw)) {
      issues.push({ path, code: "invalid_definition", message: "One-time event must be an object." });
      return;
    }
    registerOperation(raw, path);

    if (raw.type === "cash_inflow") {
      rejectUnknownKeys(raw, ["type", "id", "amount", "label"], path, issues);
      money(raw.amount, path + ".amount", issues);
      requireString(raw.label, path + ".label", issues);
      return;
    }
    if (raw.type === "cash_use") {
      rejectUnknownKeys(raw, ["type", "id", "amount", "relatedGoalId", "purpose"], path, issues);
      money(raw.amount, path + ".amount", issues);
      if (raw.relatedGoalId !== undefined && raw.relatedGoalId !== null) requireTarget(raw.relatedGoalId, ids.goals, path + ".relatedGoalId");
      if (!["generic", "medical"].includes(String(raw.purpose))) issues.push({ path: path + ".purpose", code: "invalid_enum", message: "cash_use purpose must be generic or medical." });
      return;
    }
    if (raw.type === "cash_funded_debt_payoff") {
      rejectUnknownKeys(raw, ["type", "id", "debtId"], path, issues);
      const target = requireTarget(raw.debtId, ids.debts, path + ".debtId");
      if (target) {
        if (payoffTargets.has(target)) issues.push({ path, code: "duplicate_target", message: "A debt can have only one cash-funded payoff event." });
        payoffTargets.add(target);
        if (recurringTargets.has("debt:" + target)) issues.push({ path, code: "conflicting_operation", message: "A cash-funded debt payoff cannot be combined with a recurring override of the same debt." });
      }
      return;
    }
    if (raw.type === "goal_completion") {
      rejectUnknownKeys(raw, ["type", "id", "goalId"], path, issues);
      const target = requireTarget(raw.goalId, ids.goals, path + ".goalId");
      if (target) {
        if (completedGoalTargets.has(target)) issues.push({ path, code: "duplicate_target", message: "A goal can have only one completion event." });
        completedGoalTargets.add(target);
        if (recurringTargets.has("goal:" + target)) issues.push({ path, code: "conflicting_operation", message: "Goal completion cannot be combined with a recurring override of the same goal." });
      }
      return;
    }
    issues.push({ path: path + ".type", code: "unknown_operation_type", message: "Unknown one-time scenario event type." });
  });

  const valid = issues.length === 0;
  return { valid, issues, definition: valid ? input as ScenarioDefinition : null };
}
