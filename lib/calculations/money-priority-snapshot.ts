export type RetirementAccountType =
  | "401k"
  | "403b"
  | "457b"
  | "tsp"
  | "simple_ira"
  | "traditional_ira"
  | "roth_ira"
  | "sep_ira"
  | "hsa"
  | "pension"
  | "other";

export type MoneyPrioritySnapshot = {
  householdId: string;
  people: Array<{
    id: string;
    displayName: string;
    relationship: string;
    birthDate: string | null;
    plannedRetirementAge: number | null;
    coveredByWorkplaceRetirementPlan: boolean | null;
    estimatedTaxableCompensationAnnual: number | null;
    isDependent: boolean;
    isActive: boolean;
  }>;
  income: Array<{
    id: string;
    ownerPersonId: string | null;
    name: string;
    type: string;
    monthlyTakeHomeAmount: number;
    monthlyGrossAmount: number | null;
    isVariable: boolean;
    isActive: boolean;
  }>;
  expenses: Array<{
    id: string;
    name: string;
    category: string;
    monthlyAmount: number;
    isEssential: boolean;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    cashPurpose: string;
    relatedGoalId: string | null;
    relatedDebtId: string | null;
  }>;
  debts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    annualInterestRate: number | null;
    minimumPayment: number;
    rateType: string;
    promoRateExpiresOn: string | null;
    postPromoInterestRate: number | null;
    isPastDue: boolean;
    isInCollections: boolean;
    hasLegalOrTaxPriority: boolean;
    forgivenessOrRepaymentProgram: string | null;
    scheduledPayoffDate: string | null;
  }>;
  retirementAccounts: Array<{
    id: string;
    ownerPersonId: string | null;
    name: string;
    type: RetirementAccountType;
    balance: number;
    monthlyEmployeeContribution: number;
    monthlyEmployerContribution: number;
    taxTreatment: string | null;
    employeeContributedYtd: number | null;
    employerContributedYtd: number | null;
    annualContributionTarget: number | null;
    fullMatchEmployeeContributionMonthly: number | null;
    matchStatus: string;
    hsaCoverageType: string | null;
    hsaEligible: boolean | null;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
    priority: number;
    goalClass: string;
    necessity: string;
    deadlineFlexibility: string;
    consequenceLevel: string;
    plannedMonthlyContribution: number | null;
    coreNeedAmount: number | null;
  }>;
  insuranceExposures: Array<{
    id: string;
    personId: string | null;
    name: string;
    type: string;
    deductibleAmount: number | null;
    familyDeductibleAmount: number | null;
    outOfPocketMax: number | null;
    percentageDeductible: number | null;
    insuredValue: number | null;
    isRelevantToReserve: boolean;
  }>;
  preferences: {
    emergencyFundMonthsOverride: number | null;
    debtVsInvesting: string;
    rothVsTraditional: string;
    riskTolerance: string;
    retirementPriority: string;
    jobReplacementDifficulty: string;
    knownIncomeDisruption: boolean;
    knownIncomeDisruptionEndDate: string | null;
    desiredRetirementMonthlySpending: number | null;
    retirementSpendingBasis: string;
    planningSocialSecurityMonthly: number | null;
    planningPensionMonthly: number | null;
    taxProfileYear: number | null;
    taxFilingStatus: string | null;
    estimatedModifiedAgi: number | null;
  } | null;
  aggregates: {
    monthlyTakeHomeIncome: number;
    monthlyGrossIncomeKnown: number;
    hasIncompleteGrossIncome: boolean;
    monthlyEssentialExpenses: number;
    monthlyDiscretionaryExpenses: number;
    monthlyMinimumDebtPayments: number;
    monthlyRequiredOutflow: number;
    monthlyCashFlowBeforeSavings: number;
    liquidCash: number;
    protectedCash: number;
    earmarkedCash: number;
    debtBackedCash: number;
    operatingCash: number;
    unallocatedCash: number;
    deductibleReserveTarget: number | null;
  };
  warnings: string[];
};

type Raw = Record<string, unknown>;

export type MoneyPriorityRawSnapshot = {
  householdId: string;
  people?: Raw[] | null;
  income?: Raw[] | null;
  expenses?: Raw[] | null;
  accounts?: Raw[] | null;
  debts?: Raw[] | null;
  retirementAccounts?: Raw[] | null;
  goals?: Raw[] | null;
  insuranceExposures?: Raw[] | null;
  preferences?: Raw | null;
};

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeRetirementType(value: unknown): RetirementAccountType {
  const raw = stringValue(value, "other");
  if (raw === "457") return "457b";
  const allowed: RetirementAccountType[] = ["401k", "403b", "457b", "tsp", "simple_ira", "traditional_ira", "roth_ira", "sep_ira", "hsa", "pension", "other"];
  return allowed.includes(raw as RetirementAccountType) ? (raw as RetirementAccountType) : "other";
}

export function buildMoneyPrioritySnapshot(raw: MoneyPriorityRawSnapshot): MoneyPrioritySnapshot {
  const warnings: string[] = [];

  const people = (raw.people ?? []).map((row) => ({
    id: stringValue(row.id),
    displayName: stringValue(row.display_name),
    relationship: stringValue(row.relationship, "other"),
    birthDate: nullableString(row.birth_date),
    plannedRetirementAge: nullableNumber(row.planned_retirement_age),
    coveredByWorkplaceRetirementPlan: nullableBoolean(row.covered_by_workplace_retirement_plan),
    estimatedTaxableCompensationAnnual: nullableNumber(row.estimated_taxable_compensation_annual),
    isDependent: booleanValue(row.is_dependent),
    isActive: booleanValue(row.is_active, true),
  }));

  const income = (raw.income ?? []).map((row) => ({
    id: stringValue(row.id),
    ownerPersonId: nullableString(row.owner_person_id),
    name: stringValue(row.name),
    type: stringValue(row.income_type, "employment"),
    monthlyTakeHomeAmount: numberValue(row.monthly_amount),
    monthlyGrossAmount: nullableNumber(row.monthly_gross_amount),
    isVariable: booleanValue(row.is_variable),
    isActive: booleanValue(row.is_active, true),
  }));

  const expenses = (raw.expenses ?? []).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    category: stringValue(row.category),
    monthlyAmount: numberValue(row.monthly_amount),
    isEssential: booleanValue(row.is_essential, true),
  }));

  const accounts = (raw.accounts ?? []).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    type: stringValue(row.account_type),
    balance: numberValue(row.balance),
    cashPurpose: stringValue(row.cash_purpose, "unallocated"),
    relatedGoalId: nullableString(row.related_goal_id),
    relatedDebtId: nullableString(row.related_debt_id),
  }));

  const debts = (raw.debts ?? []).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    type: stringValue(row.debt_type),
    balance: numberValue(row.current_balance),
    annualInterestRate: nullableNumber(row.interest_rate),
    minimumPayment: numberValue(row.minimum_payment),
    rateType: stringValue(row.rate_type, "fixed"),
    promoRateExpiresOn: nullableString(row.promo_rate_expires_on),
    postPromoInterestRate: nullableNumber(row.post_promo_interest_rate),
    isPastDue: booleanValue(row.is_past_due),
    isInCollections: booleanValue(row.is_in_collections),
    hasLegalOrTaxPriority: booleanValue(row.has_legal_or_tax_priority),
    forgivenessOrRepaymentProgram: nullableString(row.forgiveness_or_repayment_program),
    scheduledPayoffDate: nullableString(row.scheduled_payoff_date),
  }));

  const retirementAccounts = (raw.retirementAccounts ?? []).map((row) => ({
    id: stringValue(row.id),
    ownerPersonId: nullableString(row.owner_person_id),
    name: stringValue(row.name),
    type: normalizeRetirementType(row.account_type),
    balance: numberValue(row.balance),
    monthlyEmployeeContribution: numberValue(row.monthly_employee_contribution),
    monthlyEmployerContribution: numberValue(row.monthly_employer_contribution),
    taxTreatment: nullableString(row.tax_treatment),
    employeeContributedYtd: nullableNumber(row.employee_contributed_ytd),
    employerContributedYtd: nullableNumber(row.employer_contributed_ytd),
    annualContributionTarget: nullableNumber(row.annual_contribution_target),
    fullMatchEmployeeContributionMonthly: nullableNumber(row.full_match_employee_contribution_monthly),
    matchStatus: stringValue(row.match_status, "unknown"),
    hsaCoverageType: nullableString(row.hsa_coverage_type),
    hsaEligible: nullableBoolean(row.hsa_eligible),
  }));

  const goals = (raw.goals ?? []).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    targetAmount: numberValue(row.target_amount),
    currentAmount: numberValue(row.current_amount),
    targetDate: nullableString(row.target_date),
    priority: numberValue(row.priority),
    goalClass: stringValue(row.goal_class, "major_life_goal"),
    necessity: stringValue(row.necessity, "important"),
    deadlineFlexibility: stringValue(row.deadline_flexibility, "flexible"),
    consequenceLevel: stringValue(row.consequence_level, "moderate"),
    plannedMonthlyContribution: nullableNumber(row.planned_monthly_contribution),
    coreNeedAmount: nullableNumber(row.core_need_amount),
  }));

  const insuranceExposures = (raw.insuranceExposures ?? []).map((row) => ({
    id: stringValue(row.id),
    personId: nullableString(row.person_id),
    name: stringValue(row.name),
    type: stringValue(row.insurance_type),
    deductibleAmount: nullableNumber(row.deductible_amount),
    familyDeductibleAmount: nullableNumber(row.family_deductible_amount),
    outOfPocketMax: nullableNumber(row.out_of_pocket_max),
    percentageDeductible: nullableNumber(row.percentage_deductible),
    insuredValue: nullableNumber(row.insured_value),
    isRelevantToReserve: booleanValue(row.is_relevant_to_reserve, true),
  }));

  const preferences = raw.preferences ? {
    emergencyFundMonthsOverride: nullableNumber(raw.preferences.emergency_fund_months_override),
    debtVsInvesting: stringValue(raw.preferences.debt_vs_investing, "balanced"),
    rothVsTraditional: stringValue(raw.preferences.roth_vs_traditional, "unspecified"),
    riskTolerance: stringValue(raw.preferences.risk_tolerance, "moderate"),
    retirementPriority: stringValue(raw.preferences.retirement_priority, "balanced"),
    jobReplacementDifficulty: stringValue(raw.preferences.job_replacement_difficulty, "unknown"),
    knownIncomeDisruption: booleanValue(raw.preferences.known_income_disruption),
    knownIncomeDisruptionEndDate: nullableString(raw.preferences.known_income_disruption_end_date),
    desiredRetirementMonthlySpending: nullableNumber(raw.preferences.desired_retirement_monthly_spending),
    retirementSpendingBasis: stringValue(raw.preferences.retirement_spending_basis, "unknown"),
    planningSocialSecurityMonthly: nullableNumber(raw.preferences.planning_social_security_monthly),
    planningPensionMonthly: nullableNumber(raw.preferences.planning_pension_monthly),
    taxProfileYear: nullableNumber(raw.preferences.tax_profile_year),
    taxFilingStatus: nullableString(raw.preferences.tax_filing_status),
    estimatedModifiedAgi: nullableNumber(raw.preferences.estimated_modified_agi),
  } : null;

  const activeIncome = income.filter((item) => item.isActive);
  const monthlyTakeHomeIncome = activeIncome.reduce((sum, item) => sum + item.monthlyTakeHomeAmount, 0);
  const monthlyGrossIncomeKnown = activeIncome.reduce((sum, item) => sum + (item.monthlyGrossAmount ?? 0), 0);
  const hasIncompleteGrossIncome = activeIncome.some((item) => item.monthlyGrossAmount === null);
  const monthlyEssentialExpenses = expenses.filter((item) => item.isEssential).reduce((sum, item) => sum + item.monthlyAmount, 0);
  const monthlyDiscretionaryExpenses = expenses.filter((item) => !item.isEssential).reduce((sum, item) => sum + item.monthlyAmount, 0);
  const monthlyMinimumDebtPayments = debts.reduce((sum, item) => sum + item.minimumPayment, 0);
  const monthlyRequiredOutflow = monthlyEssentialExpenses + monthlyMinimumDebtPayments;

  const liquidAccounts = accounts.filter((item) => ["checking", "savings", "cash"].includes(item.type));
  const liquidCash = liquidAccounts.reduce((sum, item) => sum + item.balance, 0);
  const cashByPurpose = (purpose: string) => liquidAccounts.filter((item) => item.cashPurpose === purpose).reduce((sum, item) => sum + item.balance, 0);

  const deductibleCandidates = insuranceExposures
    .filter((item) => item.isRelevantToReserve)
    .flatMap((item) => {
      const percentageAmount = item.percentageDeductible !== null && item.insuredValue !== null
        ? item.percentageDeductible * item.insuredValue
        : null;
      return [item.deductibleAmount, item.familyDeductibleAmount, percentageAmount].filter((value): value is number => value !== null);
    });

  if (!income.length) warnings.push("No income sources are recorded.");
  if (!expenses.length) warnings.push("No expenses are recorded.");
  if (!insuranceExposures.length) warnings.push("No insurance deductible exposures are recorded; Stage 1 cannot be verified.");
  if (hasIncompleteGrossIncome) warnings.push("Gross income is incomplete, so retirement savings-rate calculations will be limited.");
  if (retirementAccounts.some((item) => !item.ownerPersonId)) warnings.push("At least one retirement account has no owner, so person-level contribution limits may be incomplete.");

  return {
    householdId: raw.householdId,
    people,
    income,
    expenses,
    accounts,
    debts,
    retirementAccounts,
    goals,
    insuranceExposures,
    preferences,
    aggregates: {
      monthlyTakeHomeIncome,
      monthlyGrossIncomeKnown,
      hasIncompleteGrossIncome,
      monthlyEssentialExpenses,
      monthlyDiscretionaryExpenses,
      monthlyMinimumDebtPayments,
      monthlyRequiredOutflow,
      monthlyCashFlowBeforeSavings: monthlyTakeHomeIncome - monthlyEssentialExpenses - monthlyDiscretionaryExpenses - monthlyMinimumDebtPayments,
      liquidCash,
      protectedCash: cashByPurpose("protected_reserve"),
      earmarkedCash: cashByPurpose("earmarked_goal"),
      debtBackedCash: cashByPurpose("debt_backed_reserve"),
      operatingCash: cashByPurpose("operating_cash"),
      unallocatedCash: cashByPurpose("unallocated"),
      deductibleReserveTarget: deductibleCandidates.length ? Math.max(...deductibleCandidates) : null,
    },
    warnings,
  };
}
