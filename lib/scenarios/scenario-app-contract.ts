import type { ScenarioDefinition, ScenarioValidationIssue } from "./scenario-definition.ts";

export const SCENARIO_FINGERPRINT_SCHEMA_VERSION = "scenario-basis-v1" as const;

export type ScenarioPolicyBasis = {
  moneyPriorityPolicyVersion: string;
  planningAssumptionsVersion: string;
  taxPolicyVersion: string;
  taxYear: number;
  asOfDate: string;
};

export type ScenarioBaselineDescriptor = {
  fingerprint: string;
  fingerprintSchemaVersion: typeof SCENARIO_FINGERPRINT_SCHEMA_VERSION;
  policyBasis: ScenarioPolicyBasis;
};

export type ScenarioAllocationDTO = {
  category: string;
  relatedEntityId: string | null;
  monthlyAmount: number;
  annualAmount: number | null;
  monthlyUnit: "USD/month";
  annualUnit: "USD/year";
};

export type ScenarioRecommendationDTO = {
  id: string;
  rank: number;
  stage: "stabilize" | "secure" | "build" | "optimize";
  state: "recommended" | "worth_considering" | "more_information_needed";
  urgency: "required" | "high" | "medium" | "optional";
  title: string;
  allocations: ScenarioAllocationDTO[];
  missingData: string[];
};

export type ScenarioEngineSummaryDTO = {
  feasibility: {
    status: string;
    monthlyPlanCapacity: number;
    protectedMonthlyFundingNeed: number;
    planFundingGap: number;
    unit: "USD/month";
  };
  recommendations: ScenarioRecommendationDTO[];
  warnings: string[];
  missingData: string[];
};

export type ScenarioRefreshComparisonDTO = {
  state: "current" | "refresh_recommended" | "materially_changed" | "critical_change";
  reasons: string[];
  detectedChanges: Array<{
    category: string;
    entityId: string | null;
    field: string;
    significance: "informational" | "material" | "critical";
    reason: string;
    previousValue?: string | number | boolean | null;
    currentValue?: string | number | boolean | null;
  }>;
  recommendationChanges: Array<{
    recommendationId: string;
    changeType: "added" | "removed" | "changed";
    fields: string[];
    significance: "informational" | "material" | "critical";
  }>;
  allocationChanges: Array<{
    allocationId: string;
    previousAmount: number | null;
    currentAmount: number | null;
    delta: number;
    changeType: "added" | "removed" | "increased" | "decreased";
    significance: "material";
    unit: "USD/month";
  }>;
  warningsAdded: string[];
  warningsRemoved: string[];
  missingDataAdded: string[];
  missingDataRemoved: string[];
};

export type ScenarioRunDTO = {
  status: "valid" | "more_information_needed" | "invalid" | "stale_baseline" | "unauthorized";
  scenarioId: string | null;
  baseline: ScenarioBaselineDescriptor | null;
  baselineSummary: ScenarioEngineSummaryDTO | null;
  scenarioSummary: ScenarioEngineSummaryDTO | null;
  issues: ScenarioValidationIssue[];
  comparison: ScenarioRefreshComparisonDTO | null;
  provenance: {
    hypothetical: true;
    recurringOverrideIds: string[];
    oneTimeEventIds: string[];
    cash: {
      inflowCents: number;
      genericUseCents: number;
      medicalUseCents: number;
      debtPayoffCents: number;
      netCashDeltaCents: number;
    } | null;
    paidOffDebtIds: string[];
    completedGoalIds: string[];
  } | null;
};

export type ScenarioSubmission = {
  definition: ScenarioDefinition;
  baselineFingerprint: string;
  baselinePolicyBasis: ScenarioPolicyBasis;
};

export type ScenarioRebaseDTO = {
  status: "rebased" | "unresolved" | "invalid" | "unauthorized";
  baseline: ScenarioBaselineDescriptor | null;
  baselineSummary: ScenarioEngineSummaryDTO | null;
  definition: ScenarioDefinition | null;
  issues: ScenarioValidationIssue[];
};

export type ScenarioPairComparisonDTO = {
  status: "valid" | "invalid" | "stale_baseline" | "unauthorized";
  baseline: ScenarioBaselineDescriptor | null;
  leftScenarioId: string | null;
  rightScenarioId: string | null;
  leftSummary: ScenarioEngineSummaryDTO | null;
  rightSummary: ScenarioEngineSummaryDTO | null;
  comparison: ScenarioRefreshComparisonDTO | null;
  issues: ScenarioValidationIssue[];
};

export type ScenarioEntityOption = { id: string; label: string };

export type ScenarioLabBootstrap = {
  baseline: ScenarioBaselineDescriptor;
  baselineSummary: ScenarioEngineSummaryDTO;
  entities: {
    people: ScenarioEntityOption[];
    income: ScenarioEntityOption[];
    expenses: ScenarioEntityOption[];
    debts: ScenarioEntityOption[];
    goals: ScenarioEntityOption[];
    retirementAccounts: ScenarioEntityOption[];
    insuranceExposures: ScenarioEntityOption[];
  };
};
