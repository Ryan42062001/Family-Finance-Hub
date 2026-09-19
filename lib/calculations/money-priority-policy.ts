export type EmergencyRiskTier = "low" | "moderate" | "elevated" | "high";

export type MoneyPriorityPolicy = {
  version: string;
  highInterestDebtApr: number;
  payoffFavoredDebtApr: number;
  grayZoneDebtApr: number;
  debtDecision: {
    accelerateStartingApr: number;
    retirementNearYears: number;
    longInvestmentHorizonYears: number;
    severeDebtBurdenTakeHome: number;
    nearPayoffMonths: number;
  };
  optimizeDebt: {
    mortgagePayoffFavoredApr: number;
    mortgageInvestingFavoredApr: number;
  };
  existingCash: {
    minimumUnallocatedLiquidityFloor: number;
    minimumUnallocatedLiquidityMonths: number;
    retirementCatchUpMonths: number;
  };
  vehicleAffordability: {
    preferredTermMaxMonths: number;
    normalTermMaxMonths: number;
    cautionTermMaxMonths: number;
  };
  studentLoan: {
    version: string;
    post2026FrameworkEffectiveDate: string;
    saveLongTermModelingAllowed: boolean;
    broadIdrFederalTaxExclusionEndedOn: string;
  };
  homeAffordability: {
    standardMortgageTermMaxYears: number;
    missingMaintenanceStrongMarginMultiplier: number;
  };
  emergencyReserveMonthsByRisk: Record<EmergencyRiskTier, number>;
  exceptionalEmergencyReserve: {
    automaticMaxMonths: number;
    recoveryBufferMonths: number;
    temporaryMaxMonths: number;
  };
  retirementBenchmark: {
    healthyLower: number;
    healthyUpper: number;
    wealthBuildingLower: number;
    wealthBuildingUpper: number;
  };
  hybridRetirementFloor: {
    normalRate: number;
    aheadRate: number;
    employeeGuardrailRate: number;
    maximumProtectedCorrectiveRate: number;
    aheadMinimumSurplusRatio: number;
    aheadMinimumSurplusAmount: number;
    aheadMinimumYearsToRetirement: number;
  };
  goalRiskHorizonsMonths: {
    shortTermMax: number;
    mediumTermMax: number;
  };
  planningAssumptionsVersion: string;
};

export const MONEY_PRIORITY_POLICY_V1: MoneyPriorityPolicy = {
  version: "2026.5",
  highInterestDebtApr: 0.10,
  payoffFavoredDebtApr: 0.06,
  grayZoneDebtApr: 0.04,
  debtDecision: {
    accelerateStartingApr: 0.08,
    retirementNearYears: 10,
    longInvestmentHorizonYears: 25,
    severeDebtBurdenTakeHome: 0.20,
    nearPayoffMonths: 12,
  },
  optimizeDebt: {
    mortgagePayoffFavoredApr: 0.06,
    mortgageInvestingFavoredApr: 0.04,
  },
  existingCash: {
    minimumUnallocatedLiquidityFloor: 1000,
    minimumUnallocatedLiquidityMonths: 0.5,
    retirementCatchUpMonths: 12,
  },
  vehicleAffordability: {
    preferredTermMaxMonths: 48,
    normalTermMaxMonths: 60,
    cautionTermMaxMonths: 72,
  },
  studentLoan: {
    version: "2026.1",
    post2026FrameworkEffectiveDate: "2026-07-01",
    saveLongTermModelingAllowed: false,
    broadIdrFederalTaxExclusionEndedOn: "2025-12-31",
  },
  homeAffordability: {
    standardMortgageTermMaxYears: 30,
    missingMaintenanceStrongMarginMultiplier: 2,
  },
  emergencyReserveMonthsByRisk: {
    low: 3,
    moderate: 4,
    elevated: 5,
    high: 6,
  },
  exceptionalEmergencyReserve: {
    automaticMaxMonths: 12,
    recoveryBufferMonths: 2,
    temporaryMaxMonths: 9,
  },
  retirementBenchmark: {
    healthyLower: 0.12,
    healthyUpper: 0.15,
    wealthBuildingLower: 0.20,
    wealthBuildingUpper: 0.25,
  },
  hybridRetirementFloor: {
    normalRate: 0.15,
    aheadRate: 0.12,
    employeeGuardrailRate: 0.05,
    maximumProtectedCorrectiveRate: 0.25,
    aheadMinimumSurplusRatio: 0.20,
    aheadMinimumSurplusAmount: 50000,
    aheadMinimumYearsToRetirement: 10,
  },
  goalRiskHorizonsMonths: {
    shortTermMax: 36,
    mediumTermMax: 120,
  },
  planningAssumptionsVersion: "2026.1",
};
