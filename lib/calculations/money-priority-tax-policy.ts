export type FilingStatus = "single" | "head_of_household" | "married_filing_jointly" | "married_filing_separately";

export type MoneyPriorityTaxPolicy = {
  taxYear: number;
  version: string;
  workplaceEmployeeDeferralLimit: number;
  workplaceCatchUpAge50: number;
  workplaceCatchUpAge60To63: number;
  definedContributionAnnualAdditionsLimit: number;
  simpleEmployeeDeferralLimit: number;
  simpleApplicableHigherEmployeeDeferralLimit: number;
  simpleCatchUpAge50: number;
  simpleApplicableHigherCatchUpAge50: number;
  simpleCatchUpAge60To63: number;
  sepEmployerContributionLimit: number;
  sepEmployerCompensationRate: number;
  highWageRothCatchUpThreshold: number;
  iraCombinedLimit: number;
  iraCatchUpAge50: number;
  hsaSelfOnlyLimit: number;
  hsaFamilyLimit: number;
  hsaCatchUpAge55: number;
  rothIraPhaseout: {
    singleOrHeadOfHousehold: { start: number; end: number };
    marriedFilingJointly: { start: number; end: number };
    marriedFilingSeparately: { start: number; end: number };
  };
  traditionalIraDeductionPhaseout: {
    coveredSingleOrHeadOfHousehold: { start: number; end: number };
    coveredMarriedFilingJointly: { start: number; end: number };
    coveredMarriedFilingSeparately: { start: number; end: number };
    contributorNotCoveredSpouseCoveredMarriedFilingJointly: { start: number; end: number };
  };
};

export const MONEY_PRIORITY_TAX_POLICY_2026: MoneyPriorityTaxPolicy = {
  taxYear: 2026,
  version: "2026.3",
  workplaceEmployeeDeferralLimit: 24500,
  workplaceCatchUpAge50: 8000,
  workplaceCatchUpAge60To63: 11250,
  definedContributionAnnualAdditionsLimit: 72000,
  simpleEmployeeDeferralLimit: 17000,
  simpleApplicableHigherEmployeeDeferralLimit: 18100,
  simpleCatchUpAge50: 4000,
  simpleApplicableHigherCatchUpAge50: 3850,
  simpleCatchUpAge60To63: 5250,
  sepEmployerContributionLimit: 72000,
  sepEmployerCompensationRate: 0.25,
  highWageRothCatchUpThreshold: 150000,
  iraCombinedLimit: 7500,
  iraCatchUpAge50: 1100,
  hsaSelfOnlyLimit: 4400,
  hsaFamilyLimit: 8750,
  hsaCatchUpAge55: 1000,
  rothIraPhaseout: {
    singleOrHeadOfHousehold: { start: 153000, end: 168000 },
    marriedFilingJointly: { start: 242000, end: 252000 },
    marriedFilingSeparately: { start: 0, end: 10000 },
  },
  traditionalIraDeductionPhaseout: {
    coveredSingleOrHeadOfHousehold: { start: 81000, end: 91000 },
    coveredMarriedFilingJointly: { start: 129000, end: 149000 },
    coveredMarriedFilingSeparately: { start: 0, end: 10000 },
    contributorNotCoveredSpouseCoveredMarriedFilingJointly: { start: 242000, end: 252000 },
  },
};
