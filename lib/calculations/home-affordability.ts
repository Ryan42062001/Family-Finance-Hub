import type { MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

export type HomeAffordabilityState =
  | "comfortably_affordable"
  | "affordable"
  | "stretch"
  | "not_recommended"
  | "more_information_needed";

export type HomeFinancingQuality =
  | "preferred"
  | "acceptable"
  | "caution"
  | "not_recommended"
  | "more_information_needed";

export type HomeSaleProceedsState =
  | "already_received"
  | "closing_before_purchase"
  | "simultaneous_closing"
  | "expected_after_purchase"
  | "uncertain";

export type HomePurchaseScenario = {
  purchasePrice: number;
  downPayment: number;
  mortgage: {
    rateType: "fixed" | "adjustable";
    interestRate: number;
    termYears: number;
    arm?: {
      initialFixedMonths: number;
      adjustmentFrequencyMonths: number;
      initialAdjustmentCap: number;
      subsequentAdjustmentCap: number;
      lifetimeAdjustmentCap: number;
    } | null;
    hasBalloonPayment: boolean;
    allowsNegativeAmortization: boolean;
  };
  closing: {
    closingCosts: number | null;
    prepaidCosts: number | null;
    initialEscrowDeposit: number | null;
    earnestMoneyAlreadyPaid: number;
    sellerCredits: number;
    lenderCredits: number;
    otherCredits: number;
  };
  propertyTaxesAnnual: number | null;
  insurance: {
    homeownersAnnual: number | null;
    floodAnnual: number | null;
    otherRequiredAnnual: number | null;
  };
  hoaMonthly: number | null;
  mortgageInsurance: {
    type: "none" | "conventional_pmi" | "fha_mip" | "other";
    monthlyAmount: number | null;
  };
  monthlyMaintenancePlanningAmount: number | null;
  monthlyUtilityChange: number | null;
  otherMonthlyPropertyCosts: number | null;
  immediateRequiredRepairs: number;
  plannedNearTermRepairs: number;
  currentHousingMonthlyCost: number | null;
  currentHousingCostDisappears: boolean;
  relatedGoalId?: string | null;
  homeSale?: {
    proceedsState: HomeSaleProceedsState;
    expectedNetSaleProceeds: number;
    proceedsAlreadyIncludedInSnapshotCash: boolean;
    currentHomeMonthlyCarryingCost: number;
    expectedHousingOverlapMonths: number;
  } | null;
};

export type HomeMortgageAssessment = {
  loanAmount: number;
  initialPrincipalAndInterest: number;
  stressInterestRate: number | null;
  stressedPrincipalAndInterest: number | null;
  totalPayments: number;
  totalInterest: number;
  loanToValue: number | null;
  downPaymentPercentage: number | null;
};

export type HomeCashToCloseAssessment = {
  totalAcquisitionCashCommitted: number;
  cashStillRequiredAtClosing: number;
  higherPriorityOneTimeDeployments: number;
  relatedGoalEarmarkedCash: number;
  availableSaleProceeds: number;
  unavailableSaleProceeds: number;
  requiredLiquidityFloor: number;
  legitimateCashAvailable: number;
  postClosingAvailableLiquidity: number;
  protectedCashRequired: number;
  dependsOnSimultaneousClosing: boolean;
};

export type HomeMonthlyAssessment = {
  principalAndInterest: number;
  taxesInsuranceHoaAndMortgageInsurance: number;
  maintenanceAndOtherPropertyCosts: number;
  allInHousingCost: number;
  stressedAllInHousingCost: number | null;
  incrementalHousingImpact: number;
  stressedIncrementalHousingImpact: number | null;
  postPurchaseCashFlow: number;
  stressedPostPurchaseCashFlow: number | null;
  postPurchasePlanMargin: number;
  stressedPostPurchasePlanMargin: number | null;
};

export type HomePlanImpact = {
  employerMatchPreserved: boolean;
  secureNeedsPreserved: boolean;
  requiredGoalsPreserved: boolean;
  retirementStateBefore: MoneyPriorityEngineResult["build"]["retirement"]["state"];
  retirementMonthlyAllocationDisplaced: number;
  retirementMateriallyWorsened: boolean;
};

export type HomeOverlapAssessment = {
  overlapMonths: number;
  additionalMonthlyBurdenDuringOverlap: number;
  liquidityRequiredForOverlapShortfall: number;
  overlapAffordable: boolean;
};

export type HomeDtiDiagnostics = {
  housingDti: number | null;
  totalDti: number | null;
};

export type HomeFinancingAssessment = {
  quality: HomeFinancingQuality;
  rateSignal: "preferred_range" | "ordinary_range" | "payoff_favored_range" | "unknown";
  structureSignals: string[];
  reasons: string[];
};

export type HomeAffordabilityResult = {
  purchaseReadiness: HomeAffordabilityState;
  ongoingAffordability: HomeAffordabilityState;
  financing: HomeFinancingAssessment;
  overallAffordability: HomeAffordabilityState;
  mortgage: HomeMortgageAssessment;
  cashToClose: HomeCashToCloseAssessment;
  monthly: HomeMonthlyAssessment;
  planImpact: HomePlanImpact;
  overlap: HomeOverlapAssessment;
  dti: HomeDtiDiagnostics;
  reasons: string[];
  risks: string[];
  warnings: string[];
  missingData: string[];
};

export type HomeScenarioComparison<T extends HomePurchaseScenario = HomePurchaseScenario> = {
  scenario: T;
  result: HomeAffordabilityResult;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finiteNonnegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function mortgagePayment(principal: number, annualRatePercent: number, months: number): number {
  if (principal <= 0) return 0;
  if (annualRatePercent === 0) return roundMoney(principal / months);
  const monthlyRate = annualRatePercent / 100 / 12;
  return roundMoney(principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
}

function sumMonthlyAllocations(
  result: MoneyPriorityEngineResult,
  predicate: (item: MoneyPriorityEngineResult["recommendations"][number]) => boolean,
): number {
  return roundMoney(result.recommendations
    .filter(predicate)
    .flatMap((item) => item.allocations)
    .reduce((sum, allocation) => sum + allocation.monthlyAmount, 0));
}

function retirementAllocation(result: MoneyPriorityEngineResult): number {
  return roundMoney(result.build.allocations
    .filter((allocation) => allocation.category === "retirement")
    .reduce((sum, allocation) => sum + allocation.allocatedMonthlyAmount, 0));
}

function allocatedForRecommendation(result: MoneyPriorityEngineResult, recommendationId: string): number {
  const recommendation = result.recommendations.find((item) => item.id === recommendationId);
  return roundMoney(recommendation?.allocations.reduce((sum, allocation) => sum + allocation.monthlyAmount, 0) ?? 0);
}

function securePrioritiesFullyFunded(result: MoneyPriorityEngineResult): boolean {
  return result.secure.recommendations
    .filter((item) => item.state === "recommended" && (item.urgency === "required" || item.urgency === "high"))
    .every((item) => {
      const requested = item.monthlyAmount && item.monthlyAmount > 0
        ? item.monthlyAmount
        : Math.max(0, item.gapAmount ?? 0);
      if (requested <= 0) return true;
      return allocatedForRecommendation(result, item.id) >= requested;
    });
}

function employerMatchFullyFunded(result: MoneyPriorityEngineResult): boolean {
  if (result.secure.employerMatchMonthlyGap <= 0) return true;
  const allocated = roundMoney(result.recommendations
    .filter((item) => item.stage === "secure")
    .flatMap((item) => item.allocations)
    .filter((allocation) => allocation.category === "employer_match")
    .reduce((sum, allocation) => sum + allocation.monthlyAmount, 0));
  return allocated >= result.secure.employerMatchMonthlyGap;
}

function unrelatedRequiredGoalsFullyFunded(result: MoneyPriorityEngineResult, relatedGoalId: string | null): boolean {
  return !result.build.allocations.some((allocation) =>
    allocation.category === "goal"
    && allocation.relatedEntityId !== relatedGoalId
    && allocation.rankingFactors?.economicTier === "required_protective"
    && allocation.unfundedMonthlyAmount > 0
  );
}

function protectedRecurringAllocations(result: MoneyPriorityEngineResult, relatedGoalId: string | null): number {
  const secure = sumMonthlyAllocations(result, (item) =>
    item.stage === "secure"
    && item.state === "recommended"
    && (item.urgency === "required" || item.urgency === "high"));
  const goals = roundMoney(result.build.allocations
    .filter((allocation) =>
      allocation.category === "goal"
      && allocation.relatedEntityId !== relatedGoalId
      && allocation.rankingFactors?.economicTier === "required_protective")
    .reduce((sum, allocation) => sum + allocation.allocatedMonthlyAmount, 0));
  return roundMoney(secure + goals);
}

function availableSaleProceeds(scenario: HomePurchaseScenario): {
  available: number;
  unavailable: number;
  simultaneous: boolean;
} {
  const sale = scenario.homeSale;
  if (!sale || sale.proceedsAlreadyIncludedInSnapshotCash) {
    return { available: 0, unavailable: 0, simultaneous: false };
  }
  if (sale.proceedsState === "already_received" || sale.proceedsState === "closing_before_purchase") {
    return { available: sale.expectedNetSaleProceeds, unavailable: 0, simultaneous: false };
  }
  if (sale.proceedsState === "simultaneous_closing") {
    return { available: sale.expectedNetSaleProceeds, unavailable: 0, simultaneous: true };
  }
  return { available: 0, unavailable: sale.expectedNetSaleProceeds, simultaneous: false };
}

function assessFinancing(
  scenario: HomePurchaseScenario,
  mortgage: HomeMortgageAssessment,
  stressedPlanFails: boolean,
  missingData: readonly string[],
  policy: MoneyPriorityPolicy,
): HomeFinancingAssessment {
  const structureSignals: string[] = [];
  const reasons: string[] = [];
  if (missingData.some((item) => item.startsWith("mortgage.") || item.startsWith("mortgageInsurance."))) {
    return {
      quality: "more_information_needed",
      rateSignal: "unknown",
      structureSignals: ["Material mortgage terms are missing."],
      reasons: ["Financing quality cannot be determined without complete material mortgage terms."],
    };
  }

  const rate = scenario.mortgage.interestRate / 100;
  const rateSignal = rate <= policy.optimizeDebt.mortgageInvestingFavoredApr
    ? "preferred_range"
    : rate < policy.optimizeDebt.mortgagePayoffFavoredApr
      ? "ordinary_range"
      : "payoff_favored_range";
  reasons.push(
    rateSignal === "preferred_range"
      ? "The rate is within the existing mortgage investing-favored range."
      : rateSignal === "ordinary_range"
        ? "The rate falls between the existing mortgage investing- and payoff-favored policy bands."
        : "The rate is at or above the existing mortgage payoff-favored threshold.",
  );

  if (scenario.mortgage.rateType === "adjustable") structureSignals.push("Adjustable rate");
  if (scenario.mortgage.hasBalloonPayment) structureSignals.push("Balloon payment");
  if (scenario.mortgage.allowsNegativeAmortization) structureSignals.push("Negative amortization");
  if (scenario.mortgage.termYears > policy.homeAffordability.standardMortgageTermMaxYears) {
    structureSignals.push(`Term exceeds ${policy.homeAffordability.standardMortgageTermMaxYears} years`);
  }
  if ((mortgage.loanToValue ?? 0) > 1) structureSignals.push("LTV above 100%");
  if (scenario.mortgageInsurance.type !== "none") structureSignals.push("Mortgage insurance");

  let quality: HomeFinancingQuality;
  if (scenario.mortgage.hasBalloonPayment || scenario.mortgage.allowsNegativeAmortization || stressedPlanFails) {
    quality = "not_recommended";
  } else if (scenario.mortgage.rateType === "adjustable"
    || scenario.mortgage.termYears > policy.homeAffordability.standardMortgageTermMaxYears
    || (mortgage.loanToValue ?? 0) > 1
    || rateSignal === "payoff_favored_range") {
    quality = "caution";
  } else if (rateSignal === "preferred_range"
    && (mortgage.loanToValue ?? 1) <= 0.8
    && scenario.mortgageInsurance.type === "none") {
    quality = "preferred";
  } else {
    quality = "acceptable";
  }

  if (stressedPlanFails) reasons.push("The contractual ARM stress payment breaks the required household plan.");
  if (scenario.mortgage.hasBalloonPayment) reasons.push("V1 does not assume a future refinance or payoff source for a balloon payment.");
  if (scenario.mortgage.allowsNegativeAmortization) reasons.push("The mortgage permits the principal balance to grow.");
  return { quality, rateSignal, structureSignals, reasons };
}

export function evaluateHomeAffordability(
  engine: MoneyPriorityEngineResult,
  scenario: HomePurchaseScenario,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): HomeAffordabilityResult {
  const missingData: string[] = [];
  const warnings: string[] = [];
  const risks: string[] = [];
  const reasons: string[] = [];

  const nonnegativeInputs: Array<[string, number | null]> = [
    ["purchasePrice", scenario.purchasePrice],
    ["downPayment", scenario.downPayment],
    ["mortgage.interestRate", scenario.mortgage.interestRate],
    ["mortgage.termYears", scenario.mortgage.termYears],
    ["closing.closingCosts", scenario.closing.closingCosts],
    ["closing.prepaidCosts", scenario.closing.prepaidCosts],
    ["closing.initialEscrowDeposit", scenario.closing.initialEscrowDeposit],
    ["closing.earnestMoneyAlreadyPaid", scenario.closing.earnestMoneyAlreadyPaid],
    ["closing.sellerCredits", scenario.closing.sellerCredits],
    ["closing.lenderCredits", scenario.closing.lenderCredits],
    ["closing.otherCredits", scenario.closing.otherCredits],
    ["propertyTaxesAnnual", scenario.propertyTaxesAnnual],
    ["insurance.homeownersAnnual", scenario.insurance.homeownersAnnual],
    ["insurance.floodAnnual", scenario.insurance.floodAnnual],
    ["insurance.otherRequiredAnnual", scenario.insurance.otherRequiredAnnual],
    ["hoaMonthly", scenario.hoaMonthly],
    ["immediateRequiredRepairs", scenario.immediateRequiredRepairs],
    ["plannedNearTermRepairs", scenario.plannedNearTermRepairs],
    ["currentHousingMonthlyCost", scenario.currentHousingMonthlyCost],
  ];
  for (const [name, value] of nonnegativeInputs) {
    if (value === null || !Number.isFinite(value)) missingData.push(name);
    else if (value < 0) missingData.push(`${name} must not be negative`);
  }
  const signedInputs: Array<[string, number | null]> = [
    ["monthlyUtilityChange", scenario.monthlyUtilityChange],
    ["otherMonthlyPropertyCosts", scenario.otherMonthlyPropertyCosts],
  ];
  for (const [name, value] of signedInputs) {
    if (value === null || !Number.isFinite(value)) missingData.push(name);
  }
  if (!Number.isInteger(scenario.mortgage.termYears) || scenario.mortgage.termYears <= 0) {
    missingData.push("mortgage.termYears must be a positive whole number");
  }
  if (scenario.downPayment > scenario.purchasePrice) missingData.push("downPayment must not exceed purchasePrice");
  if (scenario.mortgageInsurance.type !== "none"
    && (scenario.mortgageInsurance.monthlyAmount === null
      || !finiteNonnegative(scenario.mortgageInsurance.monthlyAmount))) {
    missingData.push("mortgageInsurance.monthlyAmount");
  }
  if (scenario.mortgageInsurance.type === "none"
    && scenario.mortgageInsurance.monthlyAmount !== null
    && !finiteNonnegative(scenario.mortgageInsurance.monthlyAmount)) {
    missingData.push("mortgageInsurance.monthlyAmount");
  }
  if (scenario.mortgage.rateType === "adjustable") {
    const arm = scenario.mortgage.arm;
    if (!arm) {
      missingData.push("mortgage.arm");
    } else {
      const armInputs: Array<[string, number]> = [
        ["mortgage.arm.initialFixedMonths", arm.initialFixedMonths],
        ["mortgage.arm.adjustmentFrequencyMonths", arm.adjustmentFrequencyMonths],
        ["mortgage.arm.initialAdjustmentCap", arm.initialAdjustmentCap],
        ["mortgage.arm.subsequentAdjustmentCap", arm.subsequentAdjustmentCap],
        ["mortgage.arm.lifetimeAdjustmentCap", arm.lifetimeAdjustmentCap],
      ];
      for (const [name, value] of armInputs) if (!finiteNonnegative(value)) missingData.push(name);
      if (!Number.isInteger(arm.initialFixedMonths) || arm.initialFixedMonths <= 0) {
        missingData.push("mortgage.arm.initialFixedMonths must be a positive whole number");
      }
      if (!Number.isInteger(arm.adjustmentFrequencyMonths) || arm.adjustmentFrequencyMonths <= 0) {
        missingData.push("mortgage.arm.adjustmentFrequencyMonths must be a positive whole number");
      }
    }
  }
  if (scenario.homeSale) {
    const saleInputs: Array<[string, number]> = [
      ["homeSale.expectedNetSaleProceeds", scenario.homeSale.expectedNetSaleProceeds],
      ["homeSale.currentHomeMonthlyCarryingCost", scenario.homeSale.currentHomeMonthlyCarryingCost],
      ["homeSale.expectedHousingOverlapMonths", scenario.homeSale.expectedHousingOverlapMonths],
    ];
    for (const [name, value] of saleInputs) if (!finiteNonnegative(value)) missingData.push(name);
    if (!Number.isInteger(scenario.homeSale.expectedHousingOverlapMonths)) {
      missingData.push("homeSale.expectedHousingOverlapMonths must be a whole number");
    }
  }
  const relatedGoalId = scenario.relatedGoalId ?? null;
  if (relatedGoalId && !engine.snapshot.goals.some((goal) => goal.id === relatedGoalId)) {
    missingData.push("relatedGoalId does not identify an existing goal");
  }

  const loanAmount = roundMoney(Math.max(0, scenario.purchasePrice - scenario.downPayment));
  const termMonths = scenario.mortgage.termYears * 12;
  const validMortgageMath = finiteNonnegative(scenario.mortgage.interestRate)
    && Number.isInteger(termMonths) && termMonths > 0;
  const initialPrincipalAndInterest = validMortgageMath
    ? mortgagePayment(loanAmount, scenario.mortgage.interestRate, termMonths)
    : 0;
  const stressInterestRate = scenario.mortgage.rateType === "adjustable" && scenario.mortgage.arm
    ? roundMoney(scenario.mortgage.interestRate + scenario.mortgage.arm.lifetimeAdjustmentCap)
    : null;
  const stressedPrincipalAndInterest = stressInterestRate !== null && validMortgageMath
    ? mortgagePayment(loanAmount, stressInterestRate, termMonths)
    : null;
  const totalPayments = roundMoney(initialPrincipalAndInterest * termMonths);
  const mortgage: HomeMortgageAssessment = {
    loanAmount,
    initialPrincipalAndInterest,
    stressInterestRate,
    stressedPrincipalAndInterest,
    totalPayments,
    totalInterest: roundMoney(Math.max(0, totalPayments - loanAmount)),
    loanToValue: scenario.purchasePrice > 0 ? Math.round((loanAmount / scenario.purchasePrice) * 10000) / 10000 : null,
    downPaymentPercentage: scenario.purchasePrice > 0
      ? Math.round((scenario.downPayment / scenario.purchasePrice) * 10000) / 10000
      : null,
  };

  const taxesInsuranceHoaAndMortgageInsurance = roundMoney(
    ((scenario.propertyTaxesAnnual ?? 0)
      + (scenario.insurance.homeownersAnnual ?? 0)
      + (scenario.insurance.floodAnnual ?? 0)
      + (scenario.insurance.otherRequiredAnnual ?? 0)) / 12
      + (scenario.hoaMonthly ?? 0)
      + (scenario.mortgageInsurance.monthlyAmount ?? 0),
  );
  const maintenanceAndOtherPropertyCosts = roundMoney(
    (scenario.monthlyMaintenancePlanningAmount ?? 0)
      + (scenario.monthlyUtilityChange ?? 0)
      + (scenario.otherMonthlyPropertyCosts ?? 0),
  );
  const allInHousingCost = roundMoney(
    initialPrincipalAndInterest + taxesInsuranceHoaAndMortgageInsurance + maintenanceAndOtherPropertyCosts,
  );
  const stressedAllInHousingCost = stressedPrincipalAndInterest === null
    ? null
    : roundMoney(stressedPrincipalAndInterest + taxesInsuranceHoaAndMortgageInsurance + maintenanceAndOtherPropertyCosts);
  const disappearingHousingCost = scenario.currentHousingCostDisappears ? (scenario.currentHousingMonthlyCost ?? 0) : 0;
  const incrementalHousingImpact = roundMoney(allInHousingCost - disappearingHousingCost);
  const stressedIncrementalHousingImpact = stressedAllInHousingCost === null
    ? null
    : roundMoney(stressedAllInHousingCost - disappearingHousingCost);

  const relatedGoalEarmarkedCash = relatedGoalId === null ? 0 : roundMoney(engine.snapshot.accounts
    .filter((account) => account.cashPurpose === "earmarked_goal" && account.relatedGoalId === relatedGoalId)
    .reduce((sum, account) => sum + account.balance, 0));
  const higherPriorityOneTimeDeployments = roundMoney(engine.existingCash.deployments
    .filter((deployment) => deployment.stage !== "optimize")
    .filter((deployment) => !(relatedGoalId !== null && deployment.category === "goal" && deployment.relatedEntityId === relatedGoalId))
    .reduce((sum, deployment) => sum + deployment.amount, 0));
  const unallocatedAfterPriority = roundMoney(Math.max(0, engine.existingCash.availableUnallocatedCash - higherPriorityOneTimeDeployments));
  const saleProceeds = availableSaleProceeds(scenario);
  const legitimateCashAvailable = roundMoney(
    Math.max(0, unallocatedAfterPriority - engine.existingCash.liquidityFloor)
      + relatedGoalEarmarkedCash
      + saleProceeds.available,
  );
  const totalCredits = roundMoney(
    scenario.closing.sellerCredits + scenario.closing.lenderCredits + scenario.closing.otherCredits,
  );
  const totalAcquisitionCashCommitted = roundMoney(Math.max(
    0,
    scenario.downPayment
      + (scenario.closing.closingCosts ?? 0)
      + (scenario.closing.prepaidCosts ?? 0)
      + (scenario.closing.initialEscrowDeposit ?? 0)
      + scenario.immediateRequiredRepairs
      - totalCredits,
  ));
  const cashStillRequiredAtClosing = roundMoney(Math.max(
    0,
    totalAcquisitionCashCommitted - scenario.closing.earnestMoneyAlreadyPaid,
  ));
  const protectedCashRequired = roundMoney(Math.max(0, cashStillRequiredAtClosing - legitimateCashAvailable));
  const postClosingAvailableLiquidity = roundMoney(Math.max(0, legitimateCashAvailable - cashStillRequiredAtClosing));
  const cashToClose: HomeCashToCloseAssessment = {
    totalAcquisitionCashCommitted,
    cashStillRequiredAtClosing,
    higherPriorityOneTimeDeployments,
    relatedGoalEarmarkedCash,
    availableSaleProceeds: saleProceeds.available,
    unavailableSaleProceeds: saleProceeds.unavailable,
    requiredLiquidityFloor: engine.existingCash.liquidityFloor,
    legitimateCashAvailable,
    postClosingAvailableLiquidity,
    protectedCashRequired,
    dependsOnSimultaneousClosing: saleProceeds.simultaneous,
  };

  const recurringNonDebtHousingCosts = roundMoney(
    taxesInsuranceHoaAndMortgageInsurance + maintenanceAndOtherPropertyCosts,
  );
  const commonChanges = {
    cashInflow: saleProceeds.available,
    cashUse: cashStillRequiredAtClosing > 0 ? { amount: cashStillRequiredAtClosing, relatedGoalId } : null,
    addExpenses: [
      ...(recurringNonDebtHousingCosts !== 0 ? [{
        id: "hypothetical-home-recurring-costs",
        name: "Hypothetical home recurring costs",
        category: "housing",
        monthlyAmount: recurringNonDebtHousingCosts,
        isEssential: true,
        cashFlowTreatment: "required" as const,
      }] : []),
      ...(disappearingHousingCost > 0 ? [{
        id: "hypothetical-current-housing-offset",
        name: "Current housing cost removed by purchase",
        category: "housing",
        monthlyAmount: -disappearingHousingCost,
        isEssential: true,
        cashFlowTreatment: "required" as const,
      }] : []),
    ],
    completeGoalIds: relatedGoalId ? [relatedGoalId] : [],
  };

  let postEngine: MoneyPriorityEngineResult | null = null;
  let stressedPostEngine: MoneyPriorityEngineResult | null = null;
  if (missingData.length === 0 && protectedCashRequired === 0) {
    postEngine = runHypotheticalMoneyPriorityEngine(engine, {
      ...commonChanges,
      addDebts: loanAmount > 0 ? [{
        id: "hypothetical-home-mortgage",
        name: "Hypothetical home mortgage",
        type: "mortgage",
        balance: loanAmount,
        annualInterestRate: scenario.mortgage.interestRate,
        minimumPayment: initialPrincipalAndInterest,
        rateType: scenario.mortgage.rateType,
      }] : [],
    }, policy).engine;

    if (stressedPrincipalAndInterest !== null && stressInterestRate !== null) {
      stressedPostEngine = runHypotheticalMoneyPriorityEngine(engine, {
        ...commonChanges,
        addDebts: loanAmount > 0 ? [{
          id: "hypothetical-home-mortgage",
          name: "Hypothetical home mortgage",
          type: "mortgage",
          balance: loanAmount,
          annualInterestRate: stressInterestRate,
          minimumPayment: stressedPrincipalAndInterest,
          rateType: "adjustable",
        }] : [],
      }, policy).engine;
    }
  }

  const prePurchasePlanMargin = roundMoney(
    engine.snapshot.aggregates.monthlyCashFlowBeforeSavings - protectedRecurringAllocations(engine, relatedGoalId),
  );
  const postPurchaseCashFlow = postEngine
    ? postEngine.snapshot.aggregates.monthlyCashFlowBeforeSavings
    : roundMoney(engine.snapshot.aggregates.monthlyCashFlowBeforeSavings - incrementalHousingImpact);
  const stressedPostPurchaseCashFlow = stressedPostEngine
    ? stressedPostEngine.snapshot.aggregates.monthlyCashFlowBeforeSavings
    : stressedIncrementalHousingImpact === null
      ? null
      : roundMoney(engine.snapshot.aggregates.monthlyCashFlowBeforeSavings - stressedIncrementalHousingImpact);
  const postPurchasePlanMargin = roundMoney(
    postPurchaseCashFlow - (postEngine ? protectedRecurringAllocations(postEngine, relatedGoalId) : protectedRecurringAllocations(engine, relatedGoalId)),
  );
  const stressedPostPurchasePlanMargin = stressedPostPurchaseCashFlow === null
    ? null
    : roundMoney(stressedPostPurchaseCashFlow - (stressedPostEngine
      ? protectedRecurringAllocations(stressedPostEngine, relatedGoalId)
      : protectedRecurringAllocations(engine, relatedGoalId)));
  const monthly: HomeMonthlyAssessment = {
    principalAndInterest: initialPrincipalAndInterest,
    taxesInsuranceHoaAndMortgageInsurance,
    maintenanceAndOtherPropertyCosts,
    allInHousingCost,
    stressedAllInHousingCost,
    incrementalHousingImpact,
    stressedIncrementalHousingImpact,
    postPurchaseCashFlow,
    stressedPostPurchaseCashFlow,
    postPurchasePlanMargin,
    stressedPostPurchasePlanMargin,
  };

  const employerMatchPreserved = postEngine !== null && employerMatchFullyFunded(postEngine);
  const secureNeedsPreserved = postEngine !== null && securePrioritiesFullyFunded(postEngine);
  const requiredGoalsPreserved = postEngine !== null && unrelatedRequiredGoalsFullyFunded(postEngine, relatedGoalId);
  const retirementBefore = retirementAllocation(engine);
  const retirementAfter = postEngine ? retirementAllocation(postEngine) : retirementBefore;
  const retirementMonthlyAllocationDisplaced = roundMoney(Math.max(0, retirementBefore - retirementAfter));
  const retirementMateriallyWorsened = postEngine !== null && (
    retirementMonthlyAllocationDisplaced > 0
    || (engine.build.retirement.state === "projection_on_track" && postEngine.build.retirement.state !== "projection_on_track")
  );
  const planImpact: HomePlanImpact = {
    employerMatchPreserved,
    secureNeedsPreserved,
    requiredGoalsPreserved,
    retirementStateBefore: engine.build.retirement.state,
    retirementMonthlyAllocationDisplaced,
    retirementMateriallyWorsened,
  };

  const overlapMonths = scenario.homeSale?.expectedHousingOverlapMonths ?? 0;
  const additionalMonthlyBurdenDuringOverlap = overlapMonths > 0 ? roundMoney(allInHousingCost) : 0;
  const liquidityRequiredForOverlapShortfall = roundMoney(
    Math.max(0, additionalMonthlyBurdenDuringOverlap - Math.max(0, prePurchasePlanMargin)) * overlapMonths,
  );
  const overlapAffordable = postClosingAvailableLiquidity >= liquidityRequiredForOverlapShortfall;
  const overlap: HomeOverlapAssessment = {
    overlapMonths,
    additionalMonthlyBurdenDuringOverlap,
    liquidityRequiredForOverlapShortfall,
    overlapAffordable,
  };

  const grossIncome = engine.snapshot.aggregates.monthlyGrossIncomeKnown;
  const housingDti = grossIncome > 0 ? Math.round((allInHousingCost / grossIncome) * 10000) / 10000 : null;
  const totalDti = grossIncome > 0
    ? Math.round(((allInHousingCost + engine.snapshot.aggregates.monthlyMinimumDebtPayments) / grossIncome) * 10000) / 10000
    : null;
  const dti: HomeDtiDiagnostics = { housingDti, totalDti };

  const thinMarginThreshold = Math.max(100, engine.snapshot.aggregates.monthlyTakeHomeIncome * 0.05);
  if (scenario.monthlyMaintenancePlanningAmount === null
    || !Number.isFinite(scenario.monthlyMaintenancePlanningAmount)
    || scenario.monthlyMaintenancePlanningAmount < 0) {
    if (postPurchasePlanMargin <= thinMarginThreshold * policy.homeAffordability.missingMaintenanceStrongMarginMultiplier) {
      missingData.push("monthlyMaintenancePlanningAmount");
    } else {
      warnings.push("Maintenance planning amount is missing; the result has strong modeled capacity but excludes this known limitation.");
    }
  }
  if (scenario.plannedNearTermRepairs > 0) {
    risks.push(`$${scenario.plannedNearTermRepairs.toFixed(2)} of planned near-term repairs is disclosed but is not treated as an immediate required acquisition cost.`);
  }

  const purchaseHardFailure = protectedCashRequired > 0
    || !engine.existingCash.secureFullyCovered
    || !overlapAffordable;
  let purchaseReadiness: HomeAffordabilityState;
  if (missingData.some((item) =>
    item.startsWith("closing.")
      || item === "purchasePrice"
      || item === "downPayment"
      || item === "immediateRequiredRepairs"
      || item.startsWith("homeSale.")
      || item.startsWith("relatedGoalId"))) {
    purchaseReadiness = "more_information_needed";
  } else if (purchaseHardFailure) {
    purchaseReadiness = "not_recommended";
  } else if (saleProceeds.simultaneous || postClosingAvailableLiquidity <= thinMarginThreshold) {
    purchaseReadiness = "stretch";
  } else if (cashStillRequiredAtClosing > legitimateCashAvailable * 0.75) {
    purchaseReadiness = "affordable";
  } else {
    purchaseReadiness = "comfortably_affordable";
  }

  const stressedPlanFails = stressedPostEngine !== null && (
    stressedPostEngine.snapshot.aggregates.monthlyCashFlowBeforeSavings < 0
    || !employerMatchFullyFunded(stressedPostEngine)
    || !securePrioritiesFullyFunded(stressedPostEngine)
    || !unrelatedRequiredGoalsFullyFunded(stressedPostEngine, relatedGoalId)
  );
  const ongoingHardFailure = postPurchaseCashFlow < 0
    || !employerMatchPreserved
    || !secureNeedsPreserved
    || !requiredGoalsPreserved;
  const monthlyMissing = missingData.some((item) =>
    item === "propertyTaxesAnnual"
      || item.startsWith("insurance.")
      || item === "hoaMonthly"
      || item.startsWith("mortgageInsurance.")
      || item === "monthlyUtilityChange"
      || item === "otherMonthlyPropertyCosts"
      || item === "monthlyMaintenancePlanningAmount"
      || item === "currentHousingMonthlyCost"
      || item.startsWith("mortgage."));
  let ongoingAffordability: HomeAffordabilityState;
  if (monthlyMissing) {
    ongoingAffordability = "more_information_needed";
  } else if (ongoingHardFailure || stressedPlanFails) {
    ongoingAffordability = "not_recommended";
  } else if (postPurchasePlanMargin <= thinMarginThreshold || retirementMateriallyWorsened) {
    ongoingAffordability = "stretch";
  } else if (incrementalHousingImpact > Math.max(0, prePurchasePlanMargin * 0.5)) {
    ongoingAffordability = "affordable";
  } else {
    ongoingAffordability = "comfortably_affordable";
  }

  const financing = assessFinancing(scenario, mortgage, stressedPlanFails, missingData, policy);
  const states = [purchaseReadiness, ongoingAffordability] as const;
  let overallAffordability: HomeAffordabilityState;
  if (states.includes("more_information_needed") || financing.quality === "more_information_needed") {
    overallAffordability = "more_information_needed";
  } else if (states.includes("not_recommended") || financing.quality === "not_recommended") {
    overallAffordability = "not_recommended";
  } else if (states.includes("stretch") || financing.quality === "caution" || retirementMateriallyWorsened) {
    overallAffordability = "stretch";
  } else if (states.includes("affordable") || financing.quality === "acceptable") {
    overallAffordability = "affordable";
  } else {
    overallAffordability = "comfortably_affordable";
  }

  if (protectedCashRequired > 0) risks.push(`The purchase requires $${protectedCashRequired.toFixed(2)} beyond legitimate available purchase cash.`);
  if (!overlapAffordable) risks.push("Post-closing liquidity cannot sustain the modeled double-housing overlap.");
  if (!employerMatchPreserved) risks.push("The housing cost prevents full employer-match capture.");
  if (!secureNeedsPreserved) risks.push("The housing cost displaces required Secure-stage funding.");
  if (!requiredGoalsPreserved) risks.push("The housing cost makes an unrelated required or protective goal infeasible.");
  if (retirementMateriallyWorsened) risks.push("The housing cost displaces a modeled recurring retirement allocation.");
  if (saleProceeds.unavailable > 0) {
    risks.push("Expected or uncertain future sale proceeds are disclosed but are not counted as current closing funds.");
  }
  if (saleProceeds.simultaneous) risks.push("Cash to close depends on the modeled simultaneous sale closing.");
  if (scenario.mortgage.rateType === "adjustable") {
    risks.push("ARM affordability is tested at the supplied contractual lifetime-cap rate, not only the initial payment.");
  }
  reasons.push("Purchase readiness, ongoing affordability, and financing quality are evaluated against an authoritative hypothetical post-purchase Phase 5 plan.");

  return {
    purchaseReadiness,
    ongoingAffordability,
    financing,
    overallAffordability,
    mortgage,
    cashToClose,
    monthly,
    planImpact,
    overlap,
    dti,
    reasons,
    risks,
    warnings,
    missingData: [...new Set(missingData)],
  };
}

const stateRank: Record<HomeAffordabilityState, number> = {
  comfortably_affordable: 0,
  affordable: 1,
  stretch: 2,
  more_information_needed: 3,
  not_recommended: 4,
};
const financingRank: Record<HomeFinancingQuality, number> = {
  preferred: 0,
  acceptable: 1,
  caution: 2,
  more_information_needed: 3,
  not_recommended: 4,
};

export function compareHomePurchaseScenarios<T extends HomePurchaseScenario>(
  engine: MoneyPriorityEngineResult,
  scenarios: readonly T[],
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): HomeScenarioComparison<T>[] {
  return scenarios
    .map((scenario) => ({ scenario, result: evaluateHomeAffordability(engine, scenario, policy) }))
    .sort((a, b) =>
      stateRank[a.result.overallAffordability] - stateRank[b.result.overallAffordability]
      || stateRank[a.result.purchaseReadiness] - stateRank[b.result.purchaseReadiness]
      || stateRank[a.result.ongoingAffordability] - stateRank[b.result.ongoingAffordability]
      || financingRank[a.result.financing.quality] - financingRank[b.result.financing.quality]
      || a.result.mortgage.totalInterest - b.result.mortgage.totalInterest
      || a.result.cashToClose.cashStillRequiredAtClosing - b.result.cashToClose.cashStillRequiredAtClosing);
}
