import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

export type StudentLoanStrategyState =
  | "ordinary_debt_policy"
  | "preserve_current_strategy"
  | "acceleration_candidate"
  | "special_review"
  | "more_information_needed";

export type StudentLoanStrategyAssessment = {
  debtId: string;
  isStudentLoan: boolean;
  state: StudentLoanStrategyState;
  ordinaryDebtPolicyAllowed: boolean;
  source: MoneyPrioritySnapshot["debts"][number]["studentLoanSource"];
  repaymentPlan: MoneyPrioritySnapshot["debts"][number]["studentLoanRepaymentPlan"];
  forgivenessStrategy: MoneyPrioritySnapshot["debts"][number]["studentLoanForgivenessStrategy"];
  forgivenessTaxTreatment: MoneyPrioritySnapshot["debts"][number]["forgivenessTaxTreatment"];
  estimatedForgivenessTaxLiability: number | null;
  employerDirectAssistanceMonthly: number;
  employerDirectAssistanceRemaining: number;
  studentLoanPaymentRetirementMatchMonthly: number;
  qualifyingPaymentRequiredForRetirementMatch: number;
  currentPaymentCapturesRetirementMatch: boolean | null;
  missingData: string[];
  reasons: string[];
  warnings: string[];
  policyVersion: string;
};

function isStudentLoanType(type: string): boolean {
  return type === "student_loan" || type === "student";
}

export function assessStudentLoanStrategy(
  debt: MoneyPrioritySnapshot["debts"][number],
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): StudentLoanStrategyAssessment {
  const isStudentLoan = isStudentLoanType(debt.type);
  const missingData: string[] = [];
  const reasons: string[] = [];
  const warnings: string[] = [];
  const assistanceMonthly = Math.max(0, debt.employerDirectLoanAssistanceMonthly ?? 0);
  const assistanceRemaining = Math.max(0, debt.employerDirectLoanAssistanceRemaining ?? 0);
  const matchMonthly = Math.max(0, debt.expectedStudentLoanBasedEmployerMatchMonthly ?? 0);
  const matchRequired = Math.max(0, debt.qualifiedPaymentRequiredForFullRetirementMatch ?? 0);
  const currentPayment = debt.currentRequiredMonthlyPayment ?? debt.minimumPayment;
  const matchOffered = debt.qualifiedStudentLoanPaymentRetirementMatchOffered === true;
  const currentPaymentCapturesRetirementMatch = matchOffered && matchRequired > 0
    ? currentPayment >= matchRequired
    : matchOffered ? null : false;

  const result = (
    state: StudentLoanStrategyState,
    ordinaryDebtPolicyAllowed: boolean,
  ): StudentLoanStrategyAssessment => ({
    debtId: debt.id,
    isStudentLoan,
    state,
    ordinaryDebtPolicyAllowed,
    source: debt.studentLoanSource,
    repaymentPlan: debt.studentLoanRepaymentPlan,
    forgivenessStrategy: debt.studentLoanForgivenessStrategy,
    forgivenessTaxTreatment: debt.forgivenessTaxTreatment,
    estimatedForgivenessTaxLiability: debt.estimatedForgivenessTaxLiability,
    employerDirectAssistanceMonthly: assistanceMonthly,
    employerDirectAssistanceRemaining: assistanceRemaining,
    studentLoanPaymentRetirementMatchMonthly: matchMonthly,
    qualifyingPaymentRequiredForRetirementMatch: matchRequired,
    currentPaymentCapturesRetirementMatch,
    missingData,
    reasons,
    warnings,
    policyVersion: policy.studentLoan.version,
  });

  if (!isStudentLoan) {
    reasons.push("Debt is not classified as a student loan.");
    return result("ordinary_debt_policy", true);
  }

  if (debt.balance <= 0) {
    reasons.push("The student-loan balance is paid.");
    return result("ordinary_debt_policy", true);
  }

  if ((debt.employerDirectLoanAssistanceMonthly === null) !== (debt.employerDirectLoanAssistanceRemaining === null)) {
    missingData.push("Both employer assistance amount and remaining benefit are required when either is reported.");
  }
  if (matchOffered) {
    if (debt.qualifiedPaymentRequiredForFullRetirementMatch === null) {
      missingData.push("Qualified student-loan payment required for the employer retirement match.");
    }
    if (debt.expectedStudentLoanBasedEmployerMatchMonthly === null) {
      missingData.push("Expected employer retirement match from qualified student-loan payments.");
    }
  }
  if (missingData.length) {
    reasons.push("Material employer-benefit information is incomplete.");
    return result("more_information_needed", false);
  }

  if ((assistanceMonthly > 0 && assistanceRemaining > 0) || (matchOffered && matchMonthly > 0)) {
    if (assistanceMonthly > 0 && assistanceRemaining > 0) {
      reasons.push(`Known employer assistance contributes $${assistanceMonthly.toFixed(2)} per month with $${assistanceRemaining.toFixed(2)} remaining.`);
    }
    if (matchOffered && matchMonthly > 0) {
      reasons.push(`Qualified student-loan payments support an expected $${matchMonthly.toFixed(2)} monthly employer retirement match.`);
    }
    reasons.push("Early payoff could forfeit a known employer benefit, so ordinary acceleration is suppressed.");
    return result("preserve_current_strategy", false);
  }

  const source = debt.studentLoanSource;
  const strategy = debt.studentLoanForgivenessStrategy;
  if (!source || source === "unknown") missingData.push("Student-loan source.");
  if (!strategy || strategy === "unknown") missingData.push("Student-loan forgiveness strategy.");
  if (missingData.length) {
    reasons.push("Source and forgiveness intent are needed before choosing ordinary acceleration or strategy preservation.");
    return result("more_information_needed", false);
  }

  if (source === "private" && strategy === "none") {
    reasons.push("Private student loan has no reported material forgiveness or employer-benefit strategy.");
    return result("ordinary_debt_policy", true);
  }

  if (source === "federal" && strategy === "none") {
    if (!debt.studentLoanRepaymentPlan || debt.studentLoanRepaymentPlan === "unknown") {
      missingData.push("Federal student-loan repayment plan.");
      reasons.push("The federal repayment plan is needed to confirm that no special repayment economics apply.");
      return result("more_information_needed", false);
    }
    reasons.push("Federal loan explicitly reports no forgiveness strategy and a known repayment plan.");
    if (debt.studentLoanRepaymentPlan === "paye" || debt.studentLoanRepaymentPlan === "icr") {
      warnings.push("PAYE/ICR is treated as legacy or transitional under the versioned 2026 policy; no future availability is assumed.");
    }
    return result("ordinary_debt_policy", true);
  }

  if (strategy === "pslf") {
    if (debt.studentLoanStrategyActive !== true) missingData.push("Active PSLF strategy confirmation.");
    if (debt.qualifyingPaymentsMade === null) missingData.push("PSLF qualifying payments made.");
    if (debt.qualifyingPaymentsRequired === null) missingData.push("PSLF qualifying payments required.");
    if (debt.estimatedForgivenessAmount === null) missingData.push("Estimated PSLF forgiveness amount.");
    if (!debt.estimatedForgivenessDate) missingData.push("Estimated PSLF forgiveness date.");
    if (debt.currentRequiredMonthlyPayment === null) missingData.push("Current required PSLF-track payment.");
    if (missingData.length) {
      reasons.push("PSLF is reported, but decision-critical household-provided progress inputs are incomplete.");
      return result("more_information_needed", false);
    }
    reasons.push("An active household-reported PSLF strategy is modeled; Family Finance Hub does not certify eligibility.");
    reasons.push("Additional principal payments may reduce the economic value of expected forgiveness.");
    return result("preserve_current_strategy", false);
  }

  if (strategy === "idr") {
    if (debt.studentLoanStrategyActive !== true) missingData.push("Active IDR-forgiveness strategy confirmation.");
    if (debt.currentRequiredMonthlyPayment === null) missingData.push("Current required IDR payment.");
    if (debt.estimatedForgivenessAmount === null) missingData.push("Estimated IDR forgiveness amount.");
    if (!debt.estimatedForgivenessDate) missingData.push("Estimated IDR forgiveness date.");
    if (!debt.forgivenessTaxTreatment || debt.forgivenessTaxTreatment === "unknown") {
      missingData.push("Forgiveness tax treatment.");
      warnings.push("Unknown tax treatment is not assumed tax-free.");
    }
    if (missingData.length) {
      reasons.push("IDR forgiveness economics cannot be assessed defensibly from the current inputs.");
      return result("more_information_needed", false);
    }
    if (debt.forgivenessTaxTreatment === "potentially_taxable"
      && debt.estimatedForgivenessTaxLiability === null) {
      warnings.push("Potentially taxable forgiveness is reported, but no estimated future tax liability was supplied; none is fabricated.");
      reasons.push("The strategy needs review because the net forgiveness value is not fully quantified.");
      return result("special_review", false);
    }
    reasons.push("A sufficiently described household-reported IDR forgiveness strategy bypasses APR-only acceleration.");
    if (debt.estimatedForgivenessTaxLiability !== null) {
      reasons.push(`The household-supplied estimated forgiveness tax liability is $${debt.estimatedForgivenessTaxLiability.toFixed(2)}.`);
    }
    if (asOfDate >= policy.studentLoan.post2026FrameworkEffectiveDate
      && debt.studentLoanRepaymentPlan === "rap") {
      reasons.push("RAP is recorded within the versioned post-July-1-2026 planning framework; V1 does not reproduce its payment formula.");
    }
    return result("preserve_current_strategy", false);
  }

  if (strategy === "teacher" || strategy === "health_service" || strategy === "other"
    || debt.forgivenessOrRepaymentProgram) {
    warnings.push("V1 does not calculate program-specific eligibility or forgiveness economics.");
    reasons.push("A material special forgiveness or repayment program requires focused review before acceleration.");
    return result("special_review", false);
  }

  reasons.push("No material special strategy changes the ordinary debt economics.");
  return result("ordinary_debt_policy", true);
}
