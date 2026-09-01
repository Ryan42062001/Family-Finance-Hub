export type ExpenseCashFlowTreatment = "required" | "discretionary";

export type StudentLoanSource = "federal" | "private" | "unknown";
export type StudentLoanRepaymentPlan = "standard" | "tiered_standard" | "ibr" | "icr" | "paye" | "rap" | "other" | "unknown";
export type StudentLoanForgivenessStrategy = "none" | "pslf" | "idr" | "teacher" | "health_service" | "other" | "unknown";
export type StudentLoanForgivenessTaxTreatment = "federally_tax_free" | "potentially_taxable" | "unknown";

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
    cashFlowTreatment: ExpenseCashFlowTreatment;
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
    studentLoanSource?: StudentLoanSource | null;
    studentLoanRepaymentPlan?: StudentLoanRepaymentPlan | null;
    studentLoanForgivenessStrategy?: StudentLoanForgivenessStrategy | null;
    studentLoanStrategyActive?: boolean | null;
    currentRequiredMonthlyPayment?: number | null;
    qualifyingPaymentsMade?: number | null;
    qualifyingPaymentsRequired?: number | null;
    estimatedForgivenessAmount?: number | null;
    estimatedForgivenessDate?: string | null;
    forgivenessTaxTreatment?: StudentLoanForgivenessTaxTreatment | null;
    estimatedForgivenessTaxLiability?: number | null;
    employerDirectLoanAssistanceMonthly?: number | null;
    employerDirectLoanAssistanceRemaining?: number | null;
    qualifiedStudentLoanPaymentRetirementMatchOffered?: boolean | null;
    qualifiedPaymentRequiredForFullRetirementMatch?: number | null;
    expectedStudentLoanBasedEmployerMatchMonthly?: number | null;
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
    simpleHigherLimitEligible?: boolean | null;
    employerContributionType?: string | null;
    planEligibleCompensationAnnual?: number | null;
    priorYearSponsorWages?: number | null;
    rothCatchUpSupported?: boolean | null;
    sepEligibleCompensationAnnual?: number | null;
    sepCompensationCalculationSupported?: boolean | null;
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
    livedWithSpouseDuringTaxYear: boolean | null;
  } | null;
  aggregates: {
    monthlyTakeHomeIncome: number;
    monthlyGrossIncomeKnown: number;
    hasIncompleteGrossIncome: boolean;
    monthlyEssentialExpenses: number;
    monthlyCommittedNonEssentialExpenses: number;
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

export type SnapshotValidationIssue = {
  path: string;
  code: "duplicate_id" | "invalid_reference" | "invalid_date" | "invalid_enum" | "invalid_number" | "missing_id";
  message: string;
};

export class MoneyPrioritySnapshotValidationError extends Error {
  readonly issues: SnapshotValidationIssue[];

  constructor(issues: SnapshotValidationIssue[]) {
    super(`Money Priority snapshot validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}.`);
    this.name = "MoneyPrioritySnapshotValidationError";
    this.issues = issues;
  }
}

export type SnapshotValidationOptions = { allowSignedHypotheticalExpenseAdjustments?: boolean };

const ENUMS = {
  relationship: ["self", "spouse_partner", "child", "dependent_adult", "other"],
  cashPurpose: ["unallocated", "protected_reserve", "earmarked_goal", "debt_backed_reserve", "operating_cash", "not_applicable"],
  studentLoanSource: ["federal", "private", "unknown"],
  studentLoanRepaymentPlan: ["standard", "tiered_standard", "ibr", "icr", "paye", "rap", "other", "unknown"],
  studentLoanForgivenessStrategy: ["none", "pslf", "idr", "teacher", "health_service", "other", "unknown"],
  forgivenessTaxTreatment: ["federally_tax_free", "potentially_taxable", "unknown"],
  goalClass: ["necessary_protective", "major_life_goal", "education", "home_purchase", "lifestyle_optional", "other", "unknown"],
  necessity: ["required", "important", "optional", "unknown"],
  deadlineFlexibility: ["fixed", "somewhat_flexible", "flexible", "unknown"],
  consequenceLevel: ["high", "moderate", "low", "unknown"],
  filingStatus: ["single", "head_of_household", "married_filing_jointly", "married_filing_separately"],
  retirementType: ["401k", "403b", "457", "457b", "tsp", "simple_ira", "traditional_ira", "roth_ira", "sep_ira", "hsa", "pension", "other"],
} as const;

function isIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function validateMoneyPriorityRawSnapshot(raw: MoneyPriorityRawSnapshot, options: SnapshotValidationOptions): SnapshotValidationIssue[] {
  const issues: SnapshotValidationIssue[] = [];
  const collections: Array<[string, Raw[]]> = [
    ["people", raw.people ?? []], ["income", raw.income ?? []], ["expenses", raw.expenses ?? []], ["accounts", raw.accounts ?? []],
    ["debts", raw.debts ?? []], ["retirementAccounts", raw.retirementAccounts ?? []], ["goals", raw.goals ?? []], ["insuranceExposures", raw.insuranceExposures ?? []],
  ];
  for (const [name, rows] of collections) {
    const ids = new Set<string>();
    rows.forEach((row, index) => {
      const id = typeof row.id === "string" ? row.id : "";
      if (!id) issues.push({ path: `${name}[${index}].id`, code: "missing_id", message: `${name} entries require a nonempty stable ID.` });
      else if (ids.has(id)) issues.push({ path: `${name}[${index}].id`, code: "duplicate_id", message: `Duplicate ${name} ID '${id}' is not allowed.` });
      else ids.add(id);
    });
  }

  const peopleIds = new Set((raw.people ?? []).map((row) => String(row.id ?? "")));
  const goalIds = new Set((raw.goals ?? []).map((row) => String(row.id ?? "")));
  const debtIds = new Set((raw.debts ?? []).map((row) => String(row.id ?? "")));
  const reference = (value: unknown, ids: Set<string>, path: string, label: string) => {
    if (value !== null && value !== undefined && value !== "" && !ids.has(String(value))) issues.push({ path, code: "invalid_reference", message: `${label} does not reference an entity in this snapshot.` });
  };
  (raw.income ?? []).forEach((row, index) => reference(row.owner_person_id, peopleIds, `income[${index}].owner_person_id`, "Income owner"));
  (raw.retirementAccounts ?? []).forEach((row, index) => reference(row.owner_person_id, peopleIds, `retirementAccounts[${index}].owner_person_id`, "Retirement owner"));
  (raw.insuranceExposures ?? []).forEach((row, index) => reference(row.person_id, peopleIds, `insuranceExposures[${index}].person_id`, "Insurance person"));
  (raw.accounts ?? []).forEach((row, index) => {
    reference(row.related_goal_id, goalIds, `accounts[${index}].related_goal_id`, "Related goal");
    reference(row.related_debt_id, debtIds, `accounts[${index}].related_debt_id`, "Related debt");
  });

  const enumValue = (value: unknown, allowed: readonly string[], path: string) => {
    if (value !== null && value !== undefined && value !== "" && (typeof value !== "string" || !allowed.includes(value))) issues.push({ path, code: "invalid_enum", message: `${path} contains an unsupported value.` });
  };
  (raw.people ?? []).forEach((row, index) => enumValue(row.relationship, ENUMS.relationship, `people[${index}].relationship`));
  (raw.accounts ?? []).forEach((row, index) => enumValue(row.cash_purpose, ENUMS.cashPurpose, `accounts[${index}].cash_purpose`));
  (raw.debts ?? []).forEach((row, index) => {
    enumValue(row.student_loan_source, ENUMS.studentLoanSource, `debts[${index}].student_loan_source`);
    enumValue(row.student_loan_repayment_plan, ENUMS.studentLoanRepaymentPlan, `debts[${index}].student_loan_repayment_plan`);
    enumValue(row.student_loan_forgiveness_strategy, ENUMS.studentLoanForgivenessStrategy, `debts[${index}].student_loan_forgiveness_strategy`);
    enumValue(row.forgiveness_tax_treatment, ENUMS.forgivenessTaxTreatment, `debts[${index}].forgiveness_tax_treatment`);
  });
  (raw.retirementAccounts ?? []).forEach((row, index) => enumValue(row.account_type, ENUMS.retirementType, `retirementAccounts[${index}].account_type`));
  (raw.goals ?? []).forEach((row, index) => {
    enumValue(row.goal_class, ENUMS.goalClass, `goals[${index}].goal_class`); enumValue(row.necessity, ENUMS.necessity, `goals[${index}].necessity`);
    enumValue(row.deadline_flexibility, ENUMS.deadlineFlexibility, `goals[${index}].deadline_flexibility`); enumValue(row.consequence_level, ENUMS.consequenceLevel, `goals[${index}].consequence_level`);
  });
  if (raw.preferences) enumValue(raw.preferences.tax_filing_status, ENUMS.filingStatus, "preferences.tax_filing_status");

  const dateValue = (value: unknown, path: string) => { if (value !== null && value !== undefined && value !== "" && !isIsoDate(value)) issues.push({ path, code: "invalid_date", message: `${path} must be a real YYYY-MM-DD calendar date.` }); };
  (raw.people ?? []).forEach((row, index) => dateValue(row.birth_date, `people[${index}].birth_date`));
  (raw.debts ?? []).forEach((row, index) => { dateValue(row.promo_rate_expires_on, `debts[${index}].promo_rate_expires_on`); dateValue(row.scheduled_payoff_date, `debts[${index}].scheduled_payoff_date`); dateValue(row.estimated_forgiveness_date, `debts[${index}].estimated_forgiveness_date`); });
  (raw.goals ?? []).forEach((row, index) => dateValue(row.target_date, `goals[${index}].target_date`));
  if (raw.preferences) dateValue(raw.preferences.known_income_disruption_end_date, "preferences.known_income_disruption_end_date");

  const nonnegative = (value: unknown, path: string, allowNegative = false) => {
    if (value === null || value === undefined || value === "") return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || (!allowNegative && parsed < 0)) issues.push({ path, code: "invalid_number", message: `${path} must be a finite nonnegative number.` });
  };
  (raw.income ?? []).forEach((row, index) => { nonnegative(row.monthly_amount, `income[${index}].monthly_amount`); nonnegative(row.monthly_gross_amount, `income[${index}].monthly_gross_amount`); });
  (raw.expenses ?? []).forEach((row, index) => nonnegative(row.monthly_amount, `expenses[${index}].monthly_amount`, options.allowSignedHypotheticalExpenseAdjustments === true));
  (raw.accounts ?? []).forEach((row, index) => nonnegative(row.balance, `accounts[${index}].balance`));
  (raw.debts ?? []).forEach((row, index) => { nonnegative(row.current_balance, `debts[${index}].current_balance`); nonnegative(row.minimum_payment, `debts[${index}].minimum_payment`); });
  (raw.retirementAccounts ?? []).forEach((row, index) => { for (const field of ["balance", "monthly_employee_contribution", "monthly_employer_contribution", "employee_contributed_ytd", "employer_contributed_ytd", "annual_contribution_target", "full_match_employee_contribution_monthly", "plan_eligible_compensation_annual", "prior_year_sponsor_wages", "sep_eligible_compensation_annual"] as const) nonnegative(row[field], `retirementAccounts[${index}].${field}`); });
  (raw.goals ?? []).forEach((row, index) => { nonnegative(row.target_amount, `goals[${index}].target_amount`); nonnegative(row.current_amount, `goals[${index}].current_amount`); nonnegative(row.planned_monthly_contribution, `goals[${index}].planned_monthly_contribution`); nonnegative(row.core_need_amount, `goals[${index}].core_need_amount`); });
  (raw.insuranceExposures ?? []).forEach((row, index) => { for (const field of ["deductible_amount", "family_deductible_amount", "out_of_pocket_max", "percentage_deductible", "insured_value"] as const) nonnegative(row[field], `insuranceExposures[${index}].${field}`); });
  return issues;
}

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

function nullableIsoDate(value: unknown): string | null {
  return isIsoDate(value) ? value as string : null;
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

export function buildMoneyPrioritySnapshot(raw: MoneyPriorityRawSnapshot, options: SnapshotValidationOptions = {}): MoneyPrioritySnapshot {
  const validationIssues = validateMoneyPriorityRawSnapshot(raw, options);
  const fatalIssues = validationIssues.filter((issue) => issue.code !== "invalid_date");
  if (fatalIssues.length) throw new MoneyPrioritySnapshotValidationError(fatalIssues);
  const warnings: string[] = validationIssues.map((issue) => issue.message);

  const people = (raw.people ?? []).map((row) => ({
    id: stringValue(row.id),
    displayName: stringValue(row.display_name),
    relationship: stringValue(row.relationship, "other"),
    birthDate: nullableIsoDate(row.birth_date),
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

  const expenses = (raw.expenses ?? []).map((row) => {
    const isEssential = booleanValue(row.is_essential, true);
    const explicitTreatment = stringValue(row.cash_flow_treatment);
    const cashFlowTreatment: ExpenseCashFlowTreatment = isEssential
      ? "required"
      : explicitTreatment === "required"
        ? "required"
        : "discretionary";
    return {
      id: stringValue(row.id),
      name: stringValue(row.name),
      category: stringValue(row.category),
      monthlyAmount: numberValue(row.monthly_amount),
      isEssential,
      cashFlowTreatment,
    };
  });

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
    promoRateExpiresOn: nullableIsoDate(row.promo_rate_expires_on),
    postPromoInterestRate: nullableNumber(row.post_promo_interest_rate),
    isPastDue: booleanValue(row.is_past_due),
    isInCollections: booleanValue(row.is_in_collections),
    hasLegalOrTaxPriority: booleanValue(row.has_legal_or_tax_priority),
    forgivenessOrRepaymentProgram: nullableString(row.forgiveness_or_repayment_program),
    scheduledPayoffDate: nullableIsoDate(row.scheduled_payoff_date),
    studentLoanSource: nullableString(row.student_loan_source) as StudentLoanSource | null,
    studentLoanRepaymentPlan: nullableString(row.student_loan_repayment_plan) as StudentLoanRepaymentPlan | null,
    studentLoanForgivenessStrategy: nullableString(row.student_loan_forgiveness_strategy) as StudentLoanForgivenessStrategy | null,
    studentLoanStrategyActive: nullableBoolean(row.student_loan_strategy_active),
    currentRequiredMonthlyPayment: nullableNumber(row.current_required_monthly_payment),
    qualifyingPaymentsMade: nullableNumber(row.qualifying_payments_made),
    qualifyingPaymentsRequired: nullableNumber(row.qualifying_payments_required),
    estimatedForgivenessAmount: nullableNumber(row.estimated_forgiveness_amount),
    estimatedForgivenessDate: nullableIsoDate(row.estimated_forgiveness_date),
    forgivenessTaxTreatment: nullableString(row.forgiveness_tax_treatment) as StudentLoanForgivenessTaxTreatment | null,
    estimatedForgivenessTaxLiability: nullableNumber(row.estimated_forgiveness_tax_liability),
    employerDirectLoanAssistanceMonthly: nullableNumber(row.employer_direct_loan_assistance_monthly),
    employerDirectLoanAssistanceRemaining: nullableNumber(row.employer_direct_loan_assistance_remaining),
    qualifiedStudentLoanPaymentRetirementMatchOffered: nullableBoolean(row.qualified_student_loan_payment_retirement_match_offered),
    qualifiedPaymentRequiredForFullRetirementMatch: nullableNumber(row.qualified_payment_required_for_full_retirement_match),
    expectedStudentLoanBasedEmployerMatchMonthly: nullableNumber(row.expected_student_loan_based_employer_match_monthly),
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
    simpleHigherLimitEligible: nullableBoolean(row.simple_higher_limit_eligible),
    employerContributionType: nullableString(row.employer_contribution_type),
    planEligibleCompensationAnnual: nullableNumber(row.plan_eligible_compensation_annual),
    priorYearSponsorWages: nullableNumber(row.prior_year_sponsor_wages),
    rothCatchUpSupported: nullableBoolean(row.roth_catch_up_supported),
    sepEligibleCompensationAnnual: nullableNumber(row.sep_eligible_compensation_annual),
    sepCompensationCalculationSupported: nullableBoolean(row.sep_compensation_calculation_supported),
  }));

  const goals = (raw.goals ?? []).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    targetAmount: numberValue(row.target_amount),
    currentAmount: numberValue(row.current_amount),
    targetDate: nullableIsoDate(row.target_date),
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
    knownIncomeDisruptionEndDate: nullableIsoDate(raw.preferences.known_income_disruption_end_date),
    desiredRetirementMonthlySpending: nullableNumber(raw.preferences.desired_retirement_monthly_spending),
    retirementSpendingBasis: stringValue(raw.preferences.retirement_spending_basis, "unknown"),
    planningSocialSecurityMonthly: nullableNumber(raw.preferences.planning_social_security_monthly),
    planningPensionMonthly: nullableNumber(raw.preferences.planning_pension_monthly),
    taxProfileYear: nullableNumber(raw.preferences.tax_profile_year),
    taxFilingStatus: nullableString(raw.preferences.tax_filing_status),
    estimatedModifiedAgi: nullableNumber(raw.preferences.estimated_modified_agi),
    livedWithSpouseDuringTaxYear: nullableBoolean(raw.preferences.lived_with_spouse_during_tax_year),
  } : null;

  const activeIncome = income.filter((item) => item.isActive);
  const monthlyTakeHomeIncome = activeIncome.reduce((sum, item) => sum + item.monthlyTakeHomeAmount, 0);
  const monthlyGrossIncomeKnown = activeIncome.reduce((sum, item) => sum + (item.monthlyGrossAmount ?? 0), 0);
  const hasIncompleteGrossIncome = activeIncome.some((item) => item.monthlyGrossAmount === null);
  const monthlyEssentialExpenses = expenses.filter((item) => item.isEssential).reduce((sum, item) => sum + item.monthlyAmount, 0);
  const monthlyCommittedNonEssentialExpenses = expenses
    .filter((item) => !item.isEssential && item.cashFlowTreatment === "required")
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  const monthlyDiscretionaryExpenses = expenses
    .filter((item) => !item.isEssential && item.cashFlowTreatment === "discretionary")
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  const monthlyMinimumDebtPayments = debts.reduce((sum, item) => sum + item.minimumPayment, 0);
  const monthlyRequiredOutflow = monthlyEssentialExpenses
    + monthlyCommittedNonEssentialExpenses
    + monthlyMinimumDebtPayments;

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
      monthlyCommittedNonEssentialExpenses,
      monthlyDiscretionaryExpenses,
      monthlyMinimumDebtPayments,
      monthlyRequiredOutflow,
      monthlyCashFlowBeforeSavings: monthlyTakeHomeIncome - monthlyRequiredOutflow - monthlyDiscretionaryExpenses,
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
