export type FilingStatus = "single" | "head_of_household" | "married_filing_jointly" | "married_filing_separately";

export type MoneyPriorityTaxPolicy = {
  taxYear: number;
  version: string;
  workplaceEmployeeDeferralLimit: number;
  workplaceCatchUpAge50: number;
  workplaceCatchUpAge60To63: number;
  iraCombinedLimit: number;
  iraCatchUpAge50: number;
  hsaSelfOnlyLimit: number;
  hsaFamilyLimit: number;
  rothIraPhaseout: {
    singleOrHeadOfHousehold: { start: number; end: number };
    marriedFilingJointly: { start: number; end: number };
    marriedFilingSeparately: { start: number; end: number };
  };
};

export const MONEY_PRIORITY_TAX_POLICY_2026: MoneyPriorityTaxPolicy = {
  taxYear: 2026,
  version: "2026.1",
  workplaceEmployeeDeferralLimit: 24500,
  workplaceCatchUpAge50: 8000,
  workplaceCatchUpAge60To63: 11250,
  iraCombinedLimit: 7500,
  iraCatchUpAge50: 1100,
  hsaSelfOnlyLimit: 4400,
  hsaFamilyLimit: 8750,
  rothIraPhaseout: {
    singleOrHeadOfHousehold: { start: 153000, end: 168000 },
    marriedFilingJointly: { start: 242000, end: 252000 },
    marriedFilingSeparately: { start: 0, end: 10000 },
  },
};
