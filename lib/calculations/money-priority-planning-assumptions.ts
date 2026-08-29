export type MoneyPriorityPlanningAssumptions = {
  version: string;
  retirement: {
    realAnnualReturn: number;
    withdrawalRate: number;
    minimumProjectionYears: number;
  };
};

export const MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1: MoneyPriorityPlanningAssumptions = {
  version: "2026.1",
  retirement: {
    // Deliberately conservative planning assumptions, not guarantees.
    // Real return is used when spending is expressed in today's dollars.
    realAnnualReturn: 0.04,
    withdrawalRate: 0.04,
    minimumProjectionYears: 1,
  },
};
