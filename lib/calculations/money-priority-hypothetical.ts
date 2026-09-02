import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import type { MoneyPriorityRawSnapshot, MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

export type HypotheticalCashUse = {
  amount: number;
  relatedGoalId?: string | null;
};

export type HypotheticalDebt = {
  id: string;
  name: string;
  type: string;
  balance: number;
  annualInterestRate: number | null;
  minimumPayment: number;
  rateType?: string;
};

export type HypotheticalExpense = {
  id: string;
  name: string;
  category: string;
  monthlyAmount: number;
  isEssential: boolean;
  cashFlowTreatment: "required" | "discretionary";
};

export type HypotheticalEngineChanges = {
  cashUse?: HypotheticalCashUse | null;
  cashInflow?: number;
  addDebts?: HypotheticalDebt[];
  addExpenses?: HypotheticalExpense[];
  completeGoalIds?: string[];
};

export type HypotheticalEngineResult = {
  engine: MoneyPriorityEngineResult;
  cashUsed: number;
  cashInflowAdded: number;
  completedGoalIds: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function snapshotToRaw(snapshot: MoneyPrioritySnapshot): MoneyPriorityRawSnapshot {
  return {
    householdId: snapshot.householdId,
    people: snapshot.people.map((item) => ({
      id: item.id,
      display_name: item.displayName,
      relationship: item.relationship,
      birth_date: item.birthDate,
      planned_retirement_age: item.plannedRetirementAge,
      covered_by_workplace_retirement_plan: item.coveredByWorkplaceRetirementPlan,
      estimated_taxable_compensation_annual: item.estimatedTaxableCompensationAnnual,
      is_dependent: item.isDependent,
      is_active: item.isActive,
    })),
    income: snapshot.income.map((item) => ({
      id: item.id,
      owner_person_id: item.ownerPersonId,
      name: item.name,
      income_type: item.type,
      monthly_amount: item.monthlyTakeHomeAmount,
      monthly_gross_amount: item.monthlyGrossAmount,
      is_variable: item.isVariable,
      is_active: item.isActive,
    })),
    expenses: snapshot.expenses.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      monthly_amount: item.monthlyAmount,
      is_essential: item.isEssential,
      cash_flow_treatment: item.cashFlowTreatment,
    })),
    accounts: snapshot.accounts.map((item) => ({
      id: item.id,
      name: item.name,
      account_type: item.type,
      balance: item.balance,
      cash_purpose: item.cashPurpose,
      related_goal_id: item.relatedGoalId,
      related_debt_id: item.relatedDebtId,
    })),
    debts: snapshot.debts.map((item) => ({
      id: item.id,
      name: item.name,
      debt_type: item.type,
      current_balance: item.balance,
      interest_rate: item.annualInterestRate,
      minimum_payment: item.minimumPayment,
      rate_type: item.rateType,
      promo_rate_expires_on: item.promoRateExpiresOn,
      post_promo_interest_rate: item.postPromoInterestRate,
      is_past_due: item.isPastDue,
      is_in_collections: item.isInCollections,
      has_legal_or_tax_priority: item.hasLegalOrTaxPriority,
      forgiveness_or_repayment_program: item.forgivenessOrRepaymentProgram,
      scheduled_payoff_date: item.scheduledPayoffDate,
      student_loan_source: item.studentLoanSource,
      student_loan_repayment_plan: item.studentLoanRepaymentPlan,
      student_loan_forgiveness_strategy: item.studentLoanForgivenessStrategy,
      student_loan_strategy_active: item.studentLoanStrategyActive,
      current_required_monthly_payment: item.currentRequiredMonthlyPayment,
      qualifying_payments_made: item.qualifyingPaymentsMade,
      qualifying_payments_required: item.qualifyingPaymentsRequired,
      estimated_forgiveness_amount: item.estimatedForgivenessAmount,
      estimated_forgiveness_date: item.estimatedForgivenessDate,
      forgiveness_tax_treatment: item.forgivenessTaxTreatment,
      estimated_forgiveness_tax_liability: item.estimatedForgivenessTaxLiability,
      employer_direct_loan_assistance_monthly: item.employerDirectLoanAssistanceMonthly,
      employer_direct_loan_assistance_remaining: item.employerDirectLoanAssistanceRemaining,
      qualified_student_loan_payment_retirement_match_offered: item.qualifiedStudentLoanPaymentRetirementMatchOffered,
      qualified_payment_required_for_full_retirement_match: item.qualifiedPaymentRequiredForFullRetirementMatch,
      expected_student_loan_based_employer_match_monthly: item.expectedStudentLoanBasedEmployerMatchMonthly,
    })),
    retirementAccounts: snapshot.retirementAccounts.map((item) => ({
      id: item.id,
      owner_person_id: item.ownerPersonId,
      name: item.name,
      account_type: item.type,
      balance: item.balance,
      monthly_employee_contribution: item.monthlyEmployeeContribution,
      monthly_employer_contribution: item.monthlyEmployerContribution,
      tax_treatment: item.taxTreatment,
      employee_contributed_ytd: item.employeeContributedYtd,
      employer_contributed_ytd: item.employerContributedYtd,
      annual_contribution_target: item.annualContributionTarget,
      full_match_employee_contribution_monthly: item.fullMatchEmployeeContributionMonthly,
      match_status: item.matchStatus,
      hsa_coverage_type: item.hsaCoverageType,
      hsa_eligible: item.hsaEligible,
      simple_higher_limit_eligible: item.simpleHigherLimitEligible,
      employer_contribution_type: item.employerContributionType,
      plan_eligible_compensation_annual: item.planEligibleCompensationAnnual,
      prior_year_sponsor_wages: item.priorYearSponsorWages,
      roth_catch_up_supported: item.rothCatchUpSupported,
      sep_eligible_compensation_annual: item.sepEligibleCompensationAnnual,
      sep_compensation_calculation_supported: item.sepCompensationCalculationSupported,
    })),
    goals: snapshot.goals.map((item) => ({
      id: item.id,
      name: item.name,
      target_amount: item.targetAmount,
      current_amount: item.currentAmount,
      target_date: item.targetDate,
      priority: item.priority,
      goal_class: item.goalClass,
      necessity: item.necessity,
      deadline_flexibility: item.deadlineFlexibility,
      consequence_level: item.consequenceLevel,
      planned_monthly_contribution: item.plannedMonthlyContribution,
      core_need_amount: item.coreNeedAmount,
    })),
    insuranceExposures: snapshot.insuranceExposures.map((item) => ({
      id: item.id,
      person_id: item.personId,
      name: item.name,
      insurance_type: item.type,
      deductible_amount: item.deductibleAmount,
      family_deductible_amount: item.familyDeductibleAmount,
      out_of_pocket_max: item.outOfPocketMax,
      percentage_deductible: item.percentageDeductible,
      insured_value: item.insuredValue,
      is_relevant_to_reserve: item.isRelevantToReserve,
    })),
    preferences: snapshot.preferences ? {
      emergency_fund_months_override: snapshot.preferences.emergencyFundMonthsOverride,
      debt_vs_investing: snapshot.preferences.debtVsInvesting,
      roth_vs_traditional: snapshot.preferences.rothVsTraditional,
      risk_tolerance: snapshot.preferences.riskTolerance,
      retirement_priority: snapshot.preferences.retirementPriority,
      job_replacement_difficulty: snapshot.preferences.jobReplacementDifficulty,
      known_income_disruption: snapshot.preferences.knownIncomeDisruption,
      known_income_disruption_end_date: snapshot.preferences.knownIncomeDisruptionEndDate,
      desired_retirement_monthly_spending: snapshot.preferences.desiredRetirementMonthlySpending,
      retirement_spending_basis: snapshot.preferences.retirementSpendingBasis,
      planning_social_security_monthly: snapshot.preferences.planningSocialSecurityMonthly,
      planning_pension_monthly: snapshot.preferences.planningPensionMonthly,
      expected_hsa_medical_spending_annual: snapshot.preferences.expectedHsaMedicalSpendingAnnual,
      tax_profile_year: snapshot.preferences.taxProfileYear,
      tax_filing_status: snapshot.preferences.taxFilingStatus,
      estimated_modified_agi: snapshot.preferences.estimatedModifiedAgi,
      lived_with_spouse_during_tax_year: snapshot.preferences.livedWithSpouseDuringTaxYear,
    } : null,
  };
}

function consumeCash(
  raw: MoneyPriorityRawSnapshot,
  amount: number,
  relatedGoalId: string | null,
): number {
  const accounts = raw.accounts ?? [];
  let remaining = roundMoney(Math.max(0, amount));
  const candidates = [...accounts]
    .filter((account) => Number(account.balance ?? 0) > 0)
    .filter((account) => account.cash_purpose === "unallocated"
      || (relatedGoalId !== null && account.cash_purpose === "earmarked_goal" && account.related_goal_id === relatedGoalId))
    .sort((a, b) => {
      const aRelated = a.cash_purpose === "earmarked_goal" ? 0 : 1;
      const bRelated = b.cash_purpose === "earmarked_goal" ? 0 : 1;
      if (aRelated !== bRelated) return aRelated - bRelated;
      return String(a.id).localeCompare(String(b.id));
    });

  for (const account of candidates) {
    if (remaining <= 0) break;
    const balance = roundMoney(Number(account.balance ?? 0));
    const used = Math.min(balance, remaining);
    account.balance = roundMoney(balance - used);
    remaining = roundMoney(remaining - used);
  }
  return roundMoney(amount - remaining);
}

export function runHypotheticalMoneyPriorityEngine(
  current: MoneyPriorityEngineResult,
  changes: HypotheticalEngineChanges,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): HypotheticalEngineResult {
  if (policy.version !== current.policyVersion) {
    throw new Error(`Hypothetical rerun policy ${policy.version} does not match current engine policy ${current.policyVersion}.`);
  }
  const raw = snapshotToRaw(current.snapshot);
  const completedGoalIds = [...new Set(changes.completeGoalIds ?? [])].sort();
  const goalSet = new Set(completedGoalIds);

  for (const goal of raw.goals ?? []) {
    if (goalSet.has(String(goal.id))) goal.current_amount = Number(goal.target_amount ?? 0);
  }

  const cashInflow = changes.cashInflow ?? 0;
  if (!finite(cashInflow) || cashInflow < 0) throw new Error("Hypothetical cash inflow must be a finite nonnegative amount.");
  if (cashInflow > 0) {
    (raw.accounts ??= []).push({
      id: "hypothetical-cash-inflow",
      name: "Hypothetical cash inflow",
      account_type: "checking",
      balance: roundMoney(cashInflow),
      cash_purpose: "unallocated",
    });
  }

  let cashUsed = 0;
  if (changes.cashUse) {
    if (!finite(changes.cashUse.amount) || changes.cashUse.amount < 0) throw new Error("Hypothetical cash use must be a finite nonnegative amount.");
    cashUsed = consumeCash(raw, changes.cashUse.amount, changes.cashUse.relatedGoalId ?? null);
    if (cashUsed !== roundMoney(changes.cashUse.amount)) {
      throw new Error("Hypothetical cash use exceeds eligible unallocated and related-goal cash.");
    }
  }

  for (const debt of changes.addDebts ?? []) {
    if (!finite(debt.balance) || debt.balance < 0 || !finite(debt.minimumPayment) || debt.minimumPayment < 0) {
      throw new Error("Hypothetical debt balance and minimum payment must be finite nonnegative amounts.");
    }
    if (debt.annualInterestRate !== null && (!finite(debt.annualInterestRate) || debt.annualInterestRate < 0)) {
      throw new Error("Hypothetical debt APR must be null or a finite nonnegative percentage.");
    }
    (raw.debts ??= []).push({
      id: debt.id,
      name: debt.name,
      debt_type: debt.type,
      current_balance: roundMoney(debt.balance),
      interest_rate: debt.annualInterestRate,
      minimum_payment: roundMoney(debt.minimumPayment),
      rate_type: debt.rateType ?? "fixed",
      is_past_due: false,
      is_in_collections: false,
      has_legal_or_tax_priority: false,
    });
  }

  for (const expense of changes.addExpenses ?? []) {
    if (!finite(expense.monthlyAmount)) throw new Error("Hypothetical expense amount must be finite.");
    (raw.expenses ??= []).push({
      id: expense.id,
      name: expense.name,
      category: expense.category,
      monthly_amount: roundMoney(expense.monthlyAmount),
      is_essential: expense.isEssential,
      cash_flow_treatment: expense.cashFlowTreatment,
    });
  }

  return {
    engine: runMoneyPriorityEngine(raw, current.asOfDate, policy, { allowSignedHypotheticalExpenseAdjustments: true }),
    cashUsed,
    cashInflowAdded: roundMoney(cashInflow),
    completedGoalIds,
  };
}
