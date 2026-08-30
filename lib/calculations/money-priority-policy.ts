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
  emergencyReserveMonthsByRisk: Record<EmergencyRiskTier, number>;
  retirementBenchmark: {
    healthyLower: number;
    healthyUpper: number;
    wealthBuildingLower: number;
    wealthBuildingUpper: number;
  };
  goalRiskHorizonsMonths: {
    shortTermMax: number;
    mediumTermMax: number;
  };
  planningAssumptionsVersion: string;
};

export const MONEY_PRIORITY_POLICY_V1: MoneyPriorityPolicy = {
  version: "2026.1",
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
  emergencyReserveMonthsByRisk: {
    low: 3,
    moderate: 4,
    elevated: 5,
    high: 6,
  },
  retirementBenchmark: {
    healthyLower: 0.12,
    healthyUpper: 0.15,
    wealthBuildingLower: 0.20,
    wealthBuildingUpper: 0.25,
  },
  goalRiskHorizonsMonths: {
    shortTermMax: 36,
    mediumTermMax: 120,
  },
  planningAssumptionsVersion: "2026.1",
};
