import type { HomeAffordabilityResult } from "../calculations/home-affordability.ts";
import type { PlanAllocation, UserMoneyPlanResult } from "../calculations/money-priority-user-plan.ts";
import type { VehicleAffordabilityResult } from "../calculations/vehicle-affordability.ts";
import type { WindfallAllocationResult } from "../calculations/money-priority-windfall.ts";
import type { ScenarioDefinition, ScenarioValidationIssue } from "./scenario-definition.ts";
import type {
  ScenarioCompositionIssue,
  SpecializedScenarioDefinition,
} from "./scenario-specialized-contract.ts";

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
  allocationId: string;
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
    significance: "informational" | "material" | "critical";
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


export type ScenarioTransportIssue = {
  path: string;
  code: string;
  message: string;
};

export type HomeSpecializedResultDTO = {
  type: "home";
  eventId: string;
  result: HomeAffordabilityResult;
  postEngineSummary: ScenarioEngineSummaryDTO | null;
  comparison: ScenarioRefreshComparisonDTO | null;
  stressedPostEngineSummary: ScenarioEngineSummaryDTO | null;
  stressedComparison: ScenarioRefreshComparisonDTO | null;
};

export type VehicleSpecializedResultDTO = {
  type: "vehicle";
  eventId: string;
  result: VehicleAffordabilityResult;
  postEngineSummary: ScenarioEngineSummaryDTO | null;
  comparison: ScenarioRefreshComparisonDTO | null;
};

export type WindfallSpecializedResultDTO = {
  type: "windfall";
  eventId: string;
  result: WindfallAllocationResult;
};

export type SpecializedScenarioResultDTO =
  | HomeSpecializedResultDTO
  | VehicleSpecializedResultDTO
  | WindfallSpecializedResultDTO;

export type ScenarioYourPlanDTO = {
  engineBasis: "generic" | "specialized";
  result: UserMoneyPlanResult;
  refresh: {
    state: ScenarioRefreshComparisonDTO["state"];
    reasons: string[];
    overrideStatuses: Array<{
      allocationId: string;
      status: "active" | "superseded" | "invalid";
      reason: string;
    }>;
  };
};

export type SpecializedScenarioRunDTO = {
  status: "valid" | "more_information_needed" | "invalid" | "stale_baseline" | "unauthorized";
  scenarioId: string | null;
  baseline: ScenarioBaselineDescriptor | null;
  baselineSummary: ScenarioEngineSummaryDTO | null;
  genericSummary: ScenarioEngineSummaryDTO | null;
  genericComparison: ScenarioRefreshComparisonDTO | null;
  specialized: SpecializedScenarioResultDTO | null;
  yourPlan: ScenarioYourPlanDTO | null;
  planAllocations: PlanAllocation[];
  conflicts: {
    valid: boolean;
    issues: ScenarioCompositionIssue[];
  } | null;
  issues: ScenarioTransportIssue[];
  provenance: {
    hypothetical: true;
    specializedDefinitionVersion: string;
    specializedType: "home" | "vehicle" | "windfall" | null;
    specializedEventId: string | null;
    genericRecurringOverrideIds: string[];
    genericOneTimeEventIds: string[];
  } | null;
};

export type SpecializedScenarioSubmission = {
  definition: SpecializedScenarioDefinition;
  baselineFingerprint: string;
  baselinePolicyBasis: ScenarioPolicyBasis;
};

export type SpecializedScenarioRebaseDTO = {
  status: "rebased" | "unresolved" | "invalid" | "unauthorized";
  baseline: ScenarioBaselineDescriptor | null;
  baselineSummary: ScenarioEngineSummaryDTO | null;
  bootstrap: ScenarioLabBootstrap | null;
  definition: SpecializedScenarioDefinition | null;
  issues: ScenarioTransportIssue[];
};
