import type { MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

export type VehicleNeedType = "necessary" | "planned_replacement" | "optional_upgrade";
export type VehicleAffordabilityState = "comfortably_affordable" | "affordable" | "stretch" | "not_recommended" | "more_information_needed";
export type VehicleFinancingQuality = "preferred" | "acceptable" | "caution" | "not_recommended" | "not_applicable" | "more_information_needed";

export type VehiclePurchaseScenario = {
  needType: VehicleNeedType;
  purchasePrice: number;
  tradeInValue: number;
  tradeInLoanPayoff: number;
  cashDownPayment: number;
  salesTax: number | null;
  titleRegistrationFees: number | null;
  otherPurchaseFees: number | null;
  loanApr: number | null;
  loanTermMonths: number | null;
  monthlyInsuranceChange: number | null;
  monthlyFuelChange: number | null;
  monthlyMaintenanceChange: number | null;
  monthlyRegistrationTaxChange: number | null;
  monthlyParkingTollsChange: number | null;
  relatedGoalId?: string | null;
  coreNeedAmount?: number | null;
};

export type VehicleAcquisitionAssessment = {
  tradeEquity: number;
  negativeEquityRolledIn: number;
  netAcquisitionCost: number;
  amountFinanced: number;
  monthlyPayment: number;
  totalLoanPayments: number;
  totalInterest: number;
  loanToValue: number | null;
};

export type VehicleMonthlyImpact = {
  loanPayment: number;
  operatingCostChange: number;
  allInMonthlyImpact: number;
  postPurchaseCashFlow: number;
  postPurchasePlanMargin: number;
};

export type VehicleCashAssessment = {
  unallocatedCashBeforeVehicle: number;
  higherPriorityOneTimeDeployments: number;
  relatedGoalEarmarkedCash: number;
  requiredLiquidityFloor: number;
  availableVehicleCash: number;
  cashRequired: number;
  protectedCashRequired: number;
};

export type VehiclePlanImpact = {
  employerMatchPreserved: boolean;
  secureNeedsPreserved: boolean;
  requiredGoalsPreserved: boolean;
  retirementStateBefore: MoneyPriorityEngineResult["build"]["retirement"]["state"];
  retirementMonthlyAllocationDisplaced: number;
  retirementMateriallyWorsened: boolean;
};

export type VehicleFinancingAssessment = {
  quality: VehicleFinancingQuality;
  aprSignal: "low" | "gray_zone" | "payoff_favored" | "high_interest" | "not_applicable" | "unknown";
  termSignal: "preferred" | "normal" | "caution" | "strong_caution" | "not_applicable" | "unknown";
  equitySignal: "strong" | "ordinary" | "underwater" | "not_applicable";
  reasons: string[];
};

export type VehicleAffordabilityResult = {
  affordability: VehicleAffordabilityState;
  financing: VehicleFinancingAssessment;
  acquisition: VehicleAcquisitionAssessment;
  monthlyImpact: VehicleMonthlyImpact;
  cash: VehicleCashAssessment;
  planImpact: VehiclePlanImpact;
  reasons: string[];
  risks: string[];
  missingData: string[];
};

export type VehicleScenarioComparison<T extends VehiclePurchaseScenario = VehiclePurchaseScenario> = { scenario: T; result: VehicleAffordabilityResult };

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function finiteNonnegative(value: number): boolean { return Number.isFinite(value) && value >= 0; }

function calculatePayment(principal: number, aprPercent: number, months: number): number {
  if (principal <= 0) return 0;
  if (aprPercent === 0) return roundMoney(principal / months);
  const monthlyRate = aprPercent / 100 / 12;
  return roundMoney(principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
}

function assessFinancing(amountFinanced: number, apr: number | null, termMonths: number | null, loanToValue: number | null, policy: MoneyPriorityPolicy): VehicleFinancingAssessment {
  if (amountFinanced <= 0) return { quality: "not_applicable", aprSignal: "not_applicable", termSignal: "not_applicable", equitySignal: "not_applicable", reasons: ["No vehicle loan is required."] };
  if (apr === null || termMonths === null || !finiteNonnegative(apr) || !Number.isInteger(termMonths) || termMonths <= 0) {
    return { quality: "more_information_needed", aprSignal: "unknown", termSignal: "unknown", equitySignal: loanToValue !== null && loanToValue > 1 ? "underwater" : "ordinary", reasons: ["A valid APR and positive whole-month loan term are required to assess financing."] };
  }
  const decimalApr = apr / 100;
  const aprSignal = decimalApr >= policy.highInterestDebtApr ? "high_interest" : decimalApr >= policy.payoffFavoredDebtApr ? "payoff_favored" : decimalApr >= policy.grayZoneDebtApr ? "gray_zone" : "low";
  const termSignal = termMonths <= policy.vehicleAffordability.preferredTermMaxMonths ? "preferred" : termMonths <= policy.vehicleAffordability.normalTermMaxMonths ? "normal" : termMonths <= policy.vehicleAffordability.cautionTermMaxMonths ? "caution" : "strong_caution";
  const equitySignal = loanToValue === null ? "not_applicable" : loanToValue <= 0.8 ? "strong" : loanToValue <= 1 ? "ordinary" : "underwater";
  let quality: VehicleFinancingQuality;
  if (aprSignal === "high_interest") quality = "not_recommended";
  else if (aprSignal === "payoff_favored" || termSignal === "strong_caution" || termSignal === "caution" || equitySignal === "underwater") quality = "caution";
  else if (aprSignal === "low" && termSignal === "preferred") quality = "preferred";
  else quality = "acceptable";
  const reasons = [
    aprSignal === "high_interest" ? "The APR meets the existing Secure-stage high-interest debt threshold." : aprSignal === "payoff_favored" ? "The APR falls in the existing payoff-favored debt range." : aprSignal === "gray_zone" ? "The APR falls in the existing debt-versus-investing gray zone." : "The APR is below the ordinary debt-acceleration thresholds.",
    termSignal === "preferred" ? `The term is within ${policy.vehicleAffordability.preferredTermMaxMonths} months.` : termSignal === "normal" ? `The term is within ${policy.vehicleAffordability.normalTermMaxMonths} months.` : termSignal === "caution" ? `The term exceeds ${policy.vehicleAffordability.normalTermMaxMonths} months and warrants caution.` : `The term exceeds ${policy.vehicleAffordability.cautionTermMaxMonths} months and warrants strong caution.`,
  ];
  if (equitySignal === "underwater") reasons.push("Amount financed exceeds the vehicle purchase price.");
  return { quality, aprSignal, termSignal, equitySignal, reasons };
}

function sumMonthlyAllocations(result: MoneyPriorityEngineResult, predicate: (item: MoneyPriorityEngineResult["recommendations"][number]) => boolean): number {
  return roundMoney(result.recommendations.filter(predicate).flatMap((item) => item.allocations).reduce((sum, allocation) => sum + allocation.monthlyAmount, 0));
}

function retirementAllocation(result: MoneyPriorityEngineResult): number {
  return roundMoney(result.build.allocations.filter((allocation) => allocation.category === "retirement").reduce((sum, allocation) => sum + allocation.allocatedMonthlyAmount, 0));
}

export function evaluateVehicleAffordability(engine: MoneyPriorityEngineResult, scenario: VehiclePurchaseScenario, policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1): VehicleAffordabilityResult {
  const missingData: string[] = [];
  const requiredAmounts: Array<[string, number | null]> = [
    ["purchasePrice", scenario.purchasePrice], ["tradeInValue", scenario.tradeInValue], ["tradeInLoanPayoff", scenario.tradeInLoanPayoff], ["cashDownPayment", scenario.cashDownPayment],
    ["salesTax", scenario.salesTax], ["titleRegistrationFees", scenario.titleRegistrationFees], ["otherPurchaseFees", scenario.otherPurchaseFees],
    ["monthlyInsuranceChange", scenario.monthlyInsuranceChange], ["monthlyFuelChange", scenario.monthlyFuelChange], ["monthlyMaintenanceChange", scenario.monthlyMaintenanceChange],
    ["monthlyRegistrationTaxChange", scenario.monthlyRegistrationTaxChange], ["monthlyParkingTollsChange", scenario.monthlyParkingTollsChange],
  ];
  for (const [name, value] of requiredAmounts) if (value === null || !Number.isFinite(value)) missingData.push(name);
  for (const [name, value] of requiredAmounts.slice(0, 7)) if (value !== null && Number.isFinite(value) && value < 0) missingData.push(`${name} must not be negative`);

  const taxesAndFees = roundMoney((scenario.salesTax ?? 0) + (scenario.titleRegistrationFees ?? 0) + (scenario.otherPurchaseFees ?? 0));
  const tradeEquity = roundMoney(scenario.tradeInValue - scenario.tradeInLoanPayoff);
  const negativeEquityRolledIn = roundMoney(Math.max(0, -tradeEquity));
  const netAcquisitionCost = roundMoney(scenario.purchasePrice + taxesAndFees - tradeEquity);
  const amountFinanced = roundMoney(Math.max(0, netAcquisitionCost - scenario.cashDownPayment));
  if (amountFinanced > 0) {
    if (scenario.loanApr === null || !finiteNonnegative(scenario.loanApr)) missingData.push("loanApr");
    if (scenario.loanTermMonths === null || !Number.isInteger(scenario.loanTermMonths) || scenario.loanTermMonths <= 0) missingData.push("loanTermMonths");
  }
  const monthlyPayment = amountFinanced > 0 && scenario.loanApr !== null && scenario.loanTermMonths !== null && finiteNonnegative(scenario.loanApr) && Number.isInteger(scenario.loanTermMonths) && scenario.loanTermMonths > 0 ? calculatePayment(amountFinanced, scenario.loanApr, scenario.loanTermMonths) : 0;
  const totalLoanPayments = roundMoney(monthlyPayment * (scenario.loanTermMonths ?? 0));
  const totalInterest = roundMoney(Math.max(0, totalLoanPayments - amountFinanced));
  const loanToValue = scenario.purchasePrice > 0 && amountFinanced > 0 ? Math.round((amountFinanced / scenario.purchasePrice) * 10000) / 10000 : null;
  const acquisition = { tradeEquity, negativeEquityRolledIn, netAcquisitionCost, amountFinanced, monthlyPayment, totalLoanPayments, totalInterest, loanToValue };
  const financing = assessFinancing(amountFinanced, scenario.loanApr, scenario.loanTermMonths, loanToValue, policy);

  const operatingCostChange = roundMoney((scenario.monthlyInsuranceChange ?? 0) + (scenario.monthlyFuelChange ?? 0) + (scenario.monthlyMaintenanceChange ?? 0) + (scenario.monthlyRegistrationTaxChange ?? 0) + (scenario.monthlyParkingTollsChange ?? 0));
  const allInMonthlyImpact = roundMoney(monthlyPayment + operatingCostChange);
  const relatedGoalId = scenario.relatedGoalId ?? null;
  if (relatedGoalId && !engine.snapshot.goals.some((goal) => goal.id === relatedGoalId)) missingData.push("relatedGoalId does not identify an existing goal");

  const relatedGoalEarmarkedCash = roundMoney(engine.snapshot.accounts.filter((account) => account.cashPurpose === "earmarked_goal" && account.relatedGoalId === relatedGoalId).reduce((sum, account) => sum + account.balance, 0));
  const higherPriorityOneTimeDeployments = roundMoney(engine.existingCash.deployments.filter((deployment) => deployment.stage !== "optimize").filter((deployment) => !(deployment.category === "goal" && deployment.relatedEntityId === relatedGoalId)).reduce((sum, deployment) => sum + deployment.amount, 0));
  const unallocatedAfterPriority = roundMoney(Math.max(0, engine.existingCash.availableUnallocatedCash - higherPriorityOneTimeDeployments));
  const availableVehicleCash = roundMoney(Math.max(0, unallocatedAfterPriority - engine.existingCash.liquidityFloor) + relatedGoalEarmarkedCash);
  const cashRequired = roundMoney(Math.min(netAcquisitionCost, scenario.cashDownPayment));
  const protectedCashRequired = roundMoney(Math.max(0, cashRequired - availableVehicleCash));
  const cash: VehicleCashAssessment = { unallocatedCashBeforeVehicle: engine.existingCash.availableUnallocatedCash, higherPriorityOneTimeDeployments, relatedGoalEarmarkedCash, requiredLiquidityFloor: engine.existingCash.liquidityFloor, availableVehicleCash, cashRequired, protectedCashRequired };

  let postEngine: MoneyPriorityEngineResult | null = null;
  if (missingData.length === 0 && protectedCashRequired === 0) {
    postEngine = runHypotheticalMoneyPriorityEngine(engine, {
      cashUse: cashRequired > 0 ? { amount: cashRequired, relatedGoalId } : null,
      addDebts: amountFinanced > 0 ? [{ id: "hypothetical-vehicle-loan", name: "Hypothetical vehicle loan", type: "auto", balance: amountFinanced, annualInterestRate: scenario.loanApr, minimumPayment: monthlyPayment, rateType: "fixed" }] : [],
      addExpenses: operatingCostChange !== 0 ? [{ id: "hypothetical-vehicle-operating-cost", name: "Hypothetical vehicle operating cost change", category: "transportation", monthlyAmount: operatingCostChange, isEssential: scenario.needType === "necessary", cashFlowTreatment: scenario.needType === "optional_upgrade" ? "discretionary" : "required" }] : [],
      completeGoalIds: relatedGoalId ? [relatedGoalId] : [],
    }, policy).engine;
  }

  const postPurchaseCashFlow = postEngine ? postEngine.snapshot.aggregates.monthlyCashFlowBeforeSavings : roundMoney(engine.snapshot.aggregates.monthlyCashFlowBeforeSavings - allInMonthlyImpact);
  const postRecurringClaims = postEngine ? sumMonthlyAllocations(postEngine, () => true) : sumMonthlyAllocations(engine, () => true);
  const postPurchasePlanMargin = roundMoney(postPurchaseCashFlow - postRecurringClaims);
  const monthlyImpact: VehicleMonthlyImpact = { loanPayment: monthlyPayment, operatingCostChange, allInMonthlyImpact, postPurchaseCashFlow, postPurchasePlanMargin };

  const beforeRequiredSecure = sumMonthlyAllocations(engine, (item) => item.stage === "secure" && item.state === "recommended" && (item.urgency === "required" || item.urgency === "high"));
  const afterRequiredSecure = postEngine ? sumMonthlyAllocations(postEngine, (item) => item.stage === "secure" && item.state === "recommended" && (item.urgency === "required" || item.urgency === "high")) : beforeRequiredSecure;
  const employerMatchPreserved = postEngine !== null && postEngine.feasibility.status !== "funding_gap" && postEngine.secure.employerMatchMonthlyGap <= engine.secure.employerMatchMonthlyGap;
  const secureNeedsPreserved = postEngine !== null && postEngine.feasibility.status !== "funding_gap" && afterRequiredSecure <= Math.max(0, postPurchaseCashFlow);
  const unrelatedRequiredGoalNeed = postEngine ? roundMoney(postEngine.build.goals.filter((goal) => goal.goalId !== relatedGoalId).reduce((sum, goal) => sum + goal.protectedMonthlyNeed, 0)) : 0;
  const requiredGoalsPreserved = postEngine !== null && postEngine.feasibility.status !== "funding_gap" && afterRequiredSecure + unrelatedRequiredGoalNeed <= Math.max(0, postPurchaseCashFlow);
  const retirementBefore = retirementAllocation(engine);
  const retirementAfter = postEngine ? retirementAllocation(postEngine) : retirementBefore;
  const retirementMonthlyAllocationDisplaced = roundMoney(Math.max(0, retirementBefore - retirementAfter));
  const retirementMateriallyWorsened = postEngine !== null && (retirementMonthlyAllocationDisplaced > 0 || (engine.build.retirement.state === "projection_on_track" && postEngine.build.retirement.state !== "projection_on_track"));
  const planImpact: VehiclePlanImpact = { employerMatchPreserved, secureNeedsPreserved, requiredGoalsPreserved, retirementStateBefore: engine.build.retirement.state, retirementMonthlyAllocationDisplaced, retirementMateriallyWorsened };

  const reasons: string[] = [];
  const risks: string[] = [];
  let affordability: VehicleAffordabilityState = "comfortably_affordable";
  if (missingData.length) {
    affordability = "more_information_needed";
    reasons.push("Material purchase, financing, or ownership-cost information is missing or invalid.");
  } else {
    const highApr = financing.aprSignal === "high_interest";
    const protectedCashFailure = protectedCashRequired > 0;
    const negativeCashFlow = postPurchaseCashFlow < 0;
    const optionalNegativeEquity = scenario.needType === "optional_upgrade" && negativeEquityRolledIn > 0;
    const hardPlanFailure = !employerMatchPreserved || !secureNeedsPreserved || !requiredGoalsPreserved;
    if (negativeCashFlow || protectedCashFailure || hardPlanFailure || optionalNegativeEquity || (highApr && scenario.needType !== "necessary")) affordability = "not_recommended";
    else {
      const prePurchasePlanMargin = roundMoney(engine.snapshot.aggregates.monthlyCashFlowBeforeSavings - sumMonthlyAllocations(engine, () => true));
      const thinMarginThreshold = Math.max(100, engine.snapshot.aggregates.monthlyTakeHomeIncome * 0.05);
      const thinMargin = postPurchasePlanMargin <= thinMarginThreshold;
      const meaningfulDiscretionaryUse = allInMonthlyImpact > Math.max(0, prePurchasePlanMargin * 0.5);
      if (scenario.needType === "necessary" && highApr) affordability = "stretch";
      else if (thinMargin || retirementMateriallyWorsened || negativeEquityRolledIn > 0 || financing.quality === "caution") affordability = "stretch";
      else if (meaningfulDiscretionaryUse || financing.quality === "acceptable") affordability = "affordable";
    }
    if (negativeCashFlow) risks.push("The purchase creates negative monthly cash flow.");
    if (protectedCashFailure) risks.push(`The proposed cash payment exceeds available vehicle cash by $${protectedCashRequired.toFixed(2)}.`);
    if (!employerMatchPreserved) risks.push("The authoritative post-purchase plan cannot preserve full employer-match capture.");
    if (!secureNeedsPreserved) risks.push("The authoritative post-purchase plan cannot preserve required Secure-stage funding.");
    if (!requiredGoalsPreserved) risks.push("The authoritative post-purchase plan makes an unrelated required or protective goal infeasible.");
    if (optionalNegativeEquity) risks.push("An optional upgrade would roll negative trade equity into the purchase.");
    if (highApr) risks.push("The proposed loan would immediately fall into the Secure high-interest debt band.");
    if (retirementMateriallyWorsened) risks.push("The authoritative post-purchase plan reduces or worsens modeled retirement funding.");
    if (financing.termSignal === "caution" || financing.termSignal === "strong_caution") risks.push("The longer loan term lowers the payment but increases duration and total financing exposure.");
    if (loanToValue !== null && loanToValue > 1) risks.push("The amount financed exceeds the vehicle value.");
    if (scenario.coreNeedAmount !== null && scenario.coreNeedAmount !== undefined && scenario.purchasePrice > scenario.coreNeedAmount) risks.push("The selected vehicle price exceeds the explicitly supplied core transportation need.");
    reasons.push(affordability === "not_recommended" && scenario.needType === "necessary" ? "Transportation appears necessary, but the authoritative post-purchase plan shows this purchase structure would compromise higher-priority financial needs." : "Affordability reflects an authoritative Money Priority Engine rerun after the hypothetical purchase.");
  }
  return { affordability, financing, acquisition, monthlyImpact, cash, planImpact, reasons, risks, missingData: [...new Set(missingData)] };
}

const affordabilityRank: Record<VehicleAffordabilityState, number> = { comfortably_affordable: 0, affordable: 1, stretch: 2, more_information_needed: 3, not_recommended: 4 };
const financingRank: Record<VehicleFinancingQuality, number> = { preferred: 0, acceptable: 1, caution: 2, not_applicable: 3, more_information_needed: 4, not_recommended: 5 };

export function compareVehiclePurchaseScenarios<T extends VehiclePurchaseScenario>(engine: MoneyPriorityEngineResult, scenarios: readonly T[], policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1): VehicleScenarioComparison<T>[] {
  return scenarios.map((scenario) => ({ scenario, result: evaluateVehicleAffordability(engine, scenario, policy) })).sort((a, b) => affordabilityRank[a.result.affordability] - affordabilityRank[b.result.affordability] || financingRank[a.result.financing.quality] - financingRank[b.result.financing.quality] || a.result.acquisition.totalInterest - b.result.acquisition.totalInterest || a.result.acquisition.netAcquisitionCost - b.result.acquisition.netAcquisitionCost || a.result.monthlyImpact.allInMonthlyImpact - b.result.monthlyImpact.allInMonthlyImpact);
}
