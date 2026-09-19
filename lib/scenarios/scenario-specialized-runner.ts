import {
  evaluateHomeAffordability,
  type HomeAffordabilityEvaluationTrace,
  type HomeAffordabilityResult,
} from "../calculations/home-affordability.ts";
import type { MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import {
  MONEY_PRIORITY_POLICY_V1,
  type MoneyPriorityPolicy,
} from "../calculations/money-priority-policy.ts";
import {
  assessRecommendationRefresh,
  type RecommendationRefreshAssessment,
} from "../calculations/money-priority-recommendation-refresh.ts";
import {
  evaluateUserPlan,
  type UserMoneyPlanResult,
} from "../calculations/money-priority-user-plan.ts";
import {
  evaluateVehicleAffordability,
  type VehicleAffordabilityEvaluationTrace,
  type VehicleAffordabilityResult,
} from "../calculations/vehicle-affordability.ts";
import {
  allocateWindfall,
  type WindfallAllocationResult,
} from "../calculations/money-priority-windfall.ts";
import type { ScenarioValidationIssue } from "./scenario-definition.ts";
import { runMoneyPriorityScenario, type ScenarioRunResult } from "./scenario-runner.ts";
import {
  detectScenarioCompositionConflicts,
  type HomeSpecializedIntent,
  type ScenarioCompositionIssue,
  type ScenarioConflictResult,
  type SpecializedScenarioDefinition,
  type VehicleSpecializedIntent,
  type WindfallSpecializedIntent,
} from "./scenario-specialized-contract.ts";

export type SpecializedScenarioRunStatus = "valid" | "more_information_needed" | "invalid";

export type HomeScenarioAdapterResult = {
  type: "home";
  eventId: string;
  result: HomeAffordabilityResult;
  postEngine: MoneyPriorityEngineResult | null;
  stressedPostEngine: MoneyPriorityEngineResult | null;
  comparison: RecommendationRefreshAssessment | null;
  stressedComparison: RecommendationRefreshAssessment | null;
};

export type VehicleScenarioAdapterResult = {
  type: "vehicle";
  eventId: string;
  result: VehicleAffordabilityResult;
  postEngine: MoneyPriorityEngineResult | null;
  comparison: RecommendationRefreshAssessment | null;
};

export type WindfallScenarioAdapterResult = {
  type: "windfall";
  eventId: string;
  result: WindfallAllocationResult;
};

export type SpecializedAdapterResult =
  | HomeScenarioAdapterResult
  | VehicleScenarioAdapterResult
  | WindfallScenarioAdapterResult;

export type ScenarioYourPlanLayer = {
  engineBasis: "generic" | "specialized";
  result: UserMoneyPlanResult;
  refresh: RecommendationRefreshAssessment;
};

export type SpecializedScenarioProvenance = {
  hypothetical: true;
  specializedDefinitionVersion: string;
  specializedType: SpecializedAdapterResult["type"] | null;
  specializedEventId: string | null;
  genericRecurringOverrideIds: string[];
  genericOneTimeEventIds: string[];
};

export type SpecializedScenarioRunResult = {
  status: SpecializedScenarioRunStatus;
  baselineEngineResult: MoneyPriorityEngineResult;
  genericRun: ScenarioRunResult;
  genericEngineResult: MoneyPriorityEngineResult | null;
  genericComparison: RecommendationRefreshAssessment | null;
  conflicts: ScenarioConflictResult;
  specialized: SpecializedAdapterResult | null;
  yourPlan: ScenarioYourPlanLayer | null;
  issues: Array<ScenarioValidationIssue | ScenarioCompositionIssue>;
  provenance: SpecializedScenarioProvenance;
};

function genericOnlyDefinition(definition: SpecializedScenarioDefinition) {
  return {
    ...definition.genericDefinition,
    specializedIntent: null,
  };
}

function genericProvenance(definition: SpecializedScenarioDefinition): SpecializedScenarioProvenance {
  return {
    hypothetical: true,
    specializedDefinitionVersion: definition.version,
    specializedType: definition.specialized?.type ?? null,
    specializedEventId: definition.specialized?.eventId ?? null,
    genericRecurringOverrideIds: [...definition.genericDefinition.recurringOverrides]
      .map((item) => item.id)
      .sort(),
    genericOneTimeEventIds: [...definition.genericDefinition.oneTimeEvents]
      .map((item) => item.id)
      .sort(),
  };
}

export function runHomeScenarioAdapter(
  engine: MoneyPriorityEngineResult,
  intent: HomeSpecializedIntent,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): HomeScenarioAdapterResult {
  let trace: HomeAffordabilityEvaluationTrace = { postEngine: null, stressedPostEngine: null };
  const result = evaluateHomeAffordability(engine, intent.scenario, policy, (captured) => {
    trace = captured;
  });
  return {
    type: "home",
    eventId: intent.eventId,
    result,
    postEngine: trace.postEngine,
    stressedPostEngine: trace.stressedPostEngine,
    comparison: trace.postEngine ? assessRecommendationRefresh(engine, trace.postEngine) : null,
    stressedComparison: trace.stressedPostEngine ? assessRecommendationRefresh(engine, trace.stressedPostEngine) : null,
  };
}

export function runVehicleScenarioAdapter(
  engine: MoneyPriorityEngineResult,
  intent: VehicleSpecializedIntent,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): VehicleScenarioAdapterResult {
  let trace: VehicleAffordabilityEvaluationTrace = { postEngine: null };
  const result = evaluateVehicleAffordability(engine, intent.scenario, policy, (captured) => {
    trace = captured;
  });
  return {
    type: "vehicle",
    eventId: intent.eventId,
    result,
    postEngine: trace.postEngine,
    comparison: trace.postEngine ? assessRecommendationRefresh(engine, trace.postEngine) : null,
  };
}

export function runWindfallScenarioAdapter(
  engine: MoneyPriorityEngineResult,
  intent: WindfallSpecializedIntent,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): WindfallScenarioAdapterResult {
  return {
    type: "windfall",
    eventId: intent.eventId,
    result: allocateWindfall(engine, intent.input, policy),
  };
}

function specializedStatus(result: SpecializedAdapterResult | null): SpecializedScenarioRunStatus {
  if (!result) return "valid";
  if (result.type === "home") {
    return result.result.overallAffordability === "more_information_needed" ? "more_information_needed" : "valid";
  }
  if (result.type === "vehicle") {
    return result.result.affordability === "more_information_needed" ? "more_information_needed" : "valid";
  }
  return result.result.state === "invalid"
    ? "invalid"
    : result.result.state === "more_information_needed"
      ? "more_information_needed"
      : "valid";
}

function planEngineFor(
  genericEngine: MoneyPriorityEngineResult,
  specialized: SpecializedAdapterResult | null,
): { engine: MoneyPriorityEngineResult | null; basis: "generic" | "specialized" } {
  if (!specialized || specialized.type === "windfall") return { engine: genericEngine, basis: "generic" };
  return { engine: specialized.postEngine, basis: "specialized" };
}

function windfallRetirementContributions(specialized: SpecializedAdapterResult | null) {
  if (!specialized || specialized.type !== "windfall") return [];
  return specialized.result.allocations
    .filter((item) => item.category === "retirement" && item.relatedEntityId !== null && item.allocatedAmount > 0)
    .map((item) => ({
      accountId: item.relatedEntityId as string,
      annualAmount: item.allocatedAmount,
      source: "windfall" as const,
    }))
    .sort((a, b) => a.accountId.localeCompare(b.accountId));
}

export function runSpecializedScenario(
  baseline: MoneyPriorityEngineResult,
  definition: SpecializedScenarioDefinition,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): SpecializedScenarioRunResult {
  const genericRun = runMoneyPriorityScenario(baseline, genericOnlyDefinition(definition), policy);
  const provenance = genericProvenance(definition);
  if (!genericRun.scenarioEngineResult) {
    return {
      status: "invalid",
      baselineEngineResult: baseline,
      genericRun,
      genericEngineResult: null,
      genericComparison: null,
      conflicts: { valid: true, issues: [] },
      specialized: null,
      yourPlan: null,
      issues: [...genericRun.issues],
      provenance,
    };
  }

  const genericEngine = genericRun.scenarioEngineResult;
  const genericComparison = assessRecommendationRefresh(baseline, genericEngine);
  const conflicts = detectScenarioCompositionConflicts(definition);
  if (!conflicts.valid) {
    return {
      status: "invalid",
      baselineEngineResult: baseline,
      genericRun,
      genericEngineResult: genericEngine,
      genericComparison,
      conflicts,
      specialized: null,
      yourPlan: null,
      issues: [...conflicts.issues],
      provenance,
    };
  }

  let specialized: SpecializedAdapterResult | null = null;
  if (definition.specialized?.type === "home") {
    specialized = runHomeScenarioAdapter(genericEngine, definition.specialized, policy);
  } else if (definition.specialized?.type === "vehicle") {
    specialized = runVehicleScenarioAdapter(genericEngine, definition.specialized, policy);
  } else if (definition.specialized?.type === "windfall") {
    specialized = runWindfallScenarioAdapter(genericEngine, definition.specialized, policy);
  }

  let status: SpecializedScenarioRunStatus = genericRun.status === "more_information_needed"
    ? "more_information_needed"
    : specializedStatus(specialized);
  if (specializedStatus(specialized) === "invalid") status = "invalid";

  let yourPlan: ScenarioYourPlanLayer | null = null;
  const issues: Array<ScenarioValidationIssue | ScenarioCompositionIssue> = [];
  if (definition.yourPlanOverrides.length) {
    const planBasis = planEngineFor(genericEngine, specialized);
    if (!planBasis.engine) {
      const planIssue: ScenarioCompositionIssue = {
        path: "specialized.yourPlanOverrides",
        code: "stable_entity_overlap",
        message: "Your Plan cannot be evaluated because the Home/Vehicle adapter did not produce an authoritative post-purchase engine result.",
      };
      issues.push(planIssue);
      status = "invalid";
    } else {
      const result = evaluateUserPlan(planBasis.engine, definition.yourPlanOverrides, {
        additionalRetirementContributions: windfallRetirementContributions(specialized),
      });
      const refresh = assessRecommendationRefresh(planBasis.engine, planBasis.engine, definition.yourPlanOverrides);
      yourPlan = { engineBasis: planBasis.basis, result, refresh };
      if (result.overrides.invalid.length) status = "invalid";
    }
  }

  return {
    status,
    baselineEngineResult: baseline,
    genericRun,
    genericEngineResult: genericEngine,
    genericComparison,
    conflicts,
    specialized,
    yourPlan,
    issues,
    provenance,
  };
}
