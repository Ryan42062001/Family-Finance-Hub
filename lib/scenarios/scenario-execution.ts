import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import { moneyPrioritySnapshotToRaw } from "../calculations/money-priority-raw-adapter.ts";
import { assessRecommendationRefresh, type RecommendationRefreshAssessment } from "../calculations/money-priority-recommendation-refresh.ts";
import { buildPlanAllocationId } from "../calculations/money-priority-user-plan.ts";
import type { MoneyPrioritySnapshot } from "../calculations/money-priority-snapshot.ts";
import {
  validateScenarioDefinition,
  type ScenarioDefinition,
  type ScenarioValidationIssue,
} from "./scenario-definition.ts";
import { runMoneyPriorityScenario } from "./scenario-runner.ts";
import {
  scenarioBaselineDescriptor,
  sameScenarioPolicyBasis,
} from "./scenario-fingerprint.ts";
import type {
  ScenarioBaselineDescriptor,
  ScenarioEngineSummaryDTO,
  ScenarioLabBootstrap,
  ScenarioPairComparisonDTO,
  ScenarioPolicyBasis,
  ScenarioRebaseDTO,
  ScenarioRefreshComparisonDTO,
  ScenarioRunDTO,
} from "./scenario-app-contract.ts";

type Row = Record<string, unknown>;

export type ScenarioAuthority = {
  authenticated: boolean;
  householdId: string | null;
};

export type ScenarioExecutionDependencies = {
  resolveAuthority: () => Promise<ScenarioAuthority>;
  loadSnapshot: (householdId: string) => Promise<MoneyPrioritySnapshot>;
  asOfDate: () => string;
};

type ParsedSubmission = {
  definition: unknown;
  baselineFingerprint: string;
  baselinePolicyBasis: ScenarioPolicyBasis;
};

function issue(path: string, code: ScenarioValidationIssue["code"], message: string): ScenarioValidationIssue {
  return { path, code, message };
}

function record(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Row, allowed: readonly string[], path: string, issues: ScenarioValidationIssue[]): void {
  const set = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!set.has(key)) issues.push(issue(`${path}.${key}`, "unknown_field", `${key} is not accepted by the Scenario Lab transport.`));
  }
}

function parsePolicyBasis(value: unknown, issues: ScenarioValidationIssue[]): ScenarioPolicyBasis | null {
  if (!record(value)) {
    issues.push(issue("request.baselinePolicyBasis", "invalid_definition", "baselinePolicyBasis must be an object."));
    return null;
  }
  exactKeys(value, ["moneyPriorityPolicyVersion", "planningAssumptionsVersion", "taxPolicyVersion", "taxYear", "asOfDate"], "request.baselinePolicyBasis", issues);
  const stringFields = ["moneyPriorityPolicyVersion", "planningAssumptionsVersion", "taxPolicyVersion", "asOfDate"] as const;
  for (const field of stringFields) {
    if (typeof value[field] !== "string" || !String(value[field]).trim()) {
      issues.push(issue(`request.baselinePolicyBasis.${field}`, "invalid_string", `${field} must be a nonempty string.`));
    }
  }
  if (!Number.isInteger(value.taxYear)) issues.push(issue("request.baselinePolicyBasis.taxYear", "invalid_number", "taxYear must be an integer."));
  if (issues.length) return null;
  return value as unknown as ScenarioPolicyBasis;
}

function parseSubmission(value: unknown): { parsed: ParsedSubmission | null; issues: ScenarioValidationIssue[] } {
  const issues: ScenarioValidationIssue[] = [];
  if (!record(value)) return { parsed: null, issues: [issue("request", "invalid_definition", "Scenario request must be an object.")] };
  exactKeys(value, ["definition", "baselineFingerprint", "baselinePolicyBasis"], "request", issues);
  if (typeof value.baselineFingerprint !== "string" || !value.baselineFingerprint.trim()) {
    issues.push(issue("request.baselineFingerprint", "invalid_string", "baselineFingerprint must be a nonempty opaque string."));
  }
  const baselinePolicyBasis = parsePolicyBasis(value.baselinePolicyBasis, issues);
  if (!baselinePolicyBasis || issues.length) return { parsed: null, issues };
  return {
    parsed: {
      definition: value.definition,
      baselineFingerprint: value.baselineFingerprint as string,
      baselinePolicyBasis,
    },
    issues,
  };
}

function scenarioId(input: unknown): string | null {
  return record(input) && typeof input.scenarioId === "string" ? input.scenarioId : null;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function missingData(engine: MoneyPriorityEngineResult): string[] {
  return unique([
    ...engine.recommendations.flatMap((item) => item.missingData),
    ...engine.build.goalIntelligence.flatMap((item) => item.missingData),
    ...engine.build.retirementAccounts.opportunities.flatMap((item) => item.missingData),
  ]);
}

export function scenarioEngineSummary(engine: MoneyPriorityEngineResult): ScenarioEngineSummaryDTO {
  return {
    feasibility: {
      status: engine.feasibility.status,
      monthlyPlanCapacity: engine.feasibility.monthlyPlanCapacity,
      protectedMonthlyFundingNeed: engine.feasibility.protectedMonthlyFundingNeed,
      planFundingGap: engine.feasibility.planFundingGap,
      unit: "USD/month",
    },
    recommendations: engine.recommendations.map((item) => ({
      id: item.id,
      rank: item.rank,
      stage: item.stage,
      state: item.state,
      urgency: item.urgency,
      title: item.title,
      allocations: item.allocations.map((allocation) => ({
        allocationId: buildPlanAllocationId(item.id, allocation.category, allocation.relatedEntityId),
        category: allocation.category,
        relatedEntityId: allocation.relatedEntityId,
        monthlyAmount: allocation.monthlyAmount,
        annualAmount: allocation.annualAmount,
        monthlyUnit: "USD/month",
        annualUnit: "USD/year",
      })),
      missingData: [...item.missingData],
    })),
    warnings: [...engine.warnings],
    missingData: missingData(engine),
  };
}

function setDifference(current: readonly string[], previous: readonly string[]): string[] {
  const before = new Set(previous);
  return unique(current.filter((item) => !before.has(item)));
}

export function scenarioRefreshComparison(
  assessment: RecommendationRefreshAssessment,
  previous: MoneyPriorityEngineResult,
  current: MoneyPriorityEngineResult,
): ScenarioRefreshComparisonDTO {
  const previousMissing = missingData(previous);
  const currentMissing = missingData(current);
  return {
    state: assessment.state,
    reasons: [...assessment.reasons],
    detectedChanges: assessment.detectedChanges.map((item) => ({ ...item })),
    recommendationChanges: assessment.recommendationChanges.map((item) => ({ ...item, fields: [...item.fields] })),
    allocationChanges: assessment.allocationChanges.map((item) => ({ ...item, unit: "USD/month" })),
    warningsAdded: setDifference(current.warnings, previous.warnings),
    warningsRemoved: setDifference(previous.warnings, current.warnings),
    missingDataAdded: setDifference(currentMissing, previousMissing),
    missingDataRemoved: setDifference(previousMissing, currentMissing),
  };
}

function unauthorizedRun(): ScenarioRunDTO {
  return {
    status: "unauthorized", scenarioId: null, baseline: null, baselineSummary: null, scenarioSummary: null,
    issues: [issue("request.auth", "invalid_definition", "Authenticated household authority is required.")],
    comparison: null, provenance: null,
  };
}

async function currentBaseline(dependencies: ScenarioExecutionDependencies): Promise<{
  authority: ScenarioAuthority;
  engine: MoneyPriorityEngineResult | null;
  baseline: ScenarioBaselineDescriptor | null;
}> {
  const authority = await dependencies.resolveAuthority();
  if (!authority.authenticated || !authority.householdId) return { authority, engine: null, baseline: null };
  const snapshot = await dependencies.loadSnapshot(authority.householdId);
  const engine = runMoneyPriorityEngine(moneyPrioritySnapshotToRaw(snapshot), dependencies.asOfDate());
  return { authority, engine, baseline: scenarioBaselineDescriptor(engine) };
}

function staleSubmission(parsed: ParsedSubmission, current: ScenarioBaselineDescriptor): boolean {
  const definitionFingerprint = record(parsed.definition) && record(parsed.definition.baselineReference)
    ? parsed.definition.baselineReference.fingerprint
    : null;
  return parsed.baselineFingerprint !== current.fingerprint
    || definitionFingerprint !== current.fingerprint
    || !sameScenarioPolicyBasis(parsed.baselinePolicyBasis, current.policyBasis);
}

function invalidRun(
  id: string | null,
  baseline: ScenarioBaselineDescriptor,
  baselineEngine: MoneyPriorityEngineResult,
  issues: ScenarioValidationIssue[],
): ScenarioRunDTO {
  return {
    status: "invalid",
    scenarioId: id,
    baseline,
    baselineSummary: scenarioEngineSummary(baselineEngine),
    scenarioSummary: null,
    issues,
    comparison: null,
    provenance: null,
  };
}

function runValidated(
  baselineEngine: MoneyPriorityEngineResult,
  definition: ScenarioDefinition,
): { dto: ScenarioRunDTO; scenarioEngine: MoneyPriorityEngineResult | null } {
  const baseline = scenarioBaselineDescriptor(baselineEngine);
  const result = runMoneyPriorityScenario(baselineEngine, definition);
  if (!result.scenarioEngineResult) return {
    dto: invalidRun(definition.scenarioId, baseline, baselineEngine, result.issues),
    scenarioEngine: null,
  };
  const comparison = assessRecommendationRefresh(baselineEngine, result.scenarioEngineResult);
  return {
    dto: {
      status: result.status,
      scenarioId: definition.scenarioId,
      baseline,
      baselineSummary: scenarioEngineSummary(baselineEngine),
      scenarioSummary: scenarioEngineSummary(result.scenarioEngineResult),
      issues: [...result.issues],
      comparison: scenarioRefreshComparison(comparison, baselineEngine, result.scenarioEngineResult),
      provenance: {
        hypothetical: true,
        recurringOverrideIds: [...(result.provenance.overlay?.recurringOverrideIds ?? [])],
        oneTimeEventIds: [...(result.provenance.overlay?.oneTimeEventIds ?? [])],
        cash: result.provenance.overlay ? { ...result.provenance.overlay.cash } : null,
        paidOffDebtIds: [...(result.provenance.overlay?.paidOffDebtIds ?? [])],
        completedGoalIds: [...(result.provenance.overlay?.completedGoalIds ?? [])],
      },
    },
    scenarioEngine: result.scenarioEngineResult,
  };
}

export async function executeScenarioRun(input: unknown, dependencies: ScenarioExecutionDependencies): Promise<ScenarioRunDTO> {
  const current = await currentBaseline(dependencies);
  if (!current.engine || !current.baseline) return unauthorizedRun();

  const transport = parseSubmission(input);
  if (!transport.parsed) return invalidRun(null, current.baseline, current.engine, transport.issues);
  const id = scenarioId(transport.parsed.definition);

  if (staleSubmission(transport.parsed, current.baseline)) {
    return {
      status: "stale_baseline",
      scenarioId: id,
      baseline: current.baseline,
      baselineSummary: scenarioEngineSummary(current.engine),
      scenarioSummary: null,
      issues: [issue("request.baselineFingerprint", "invalid_definition", "The household financial basis or policy basis changed. Explicit rebase is required before execution.")],
      comparison: null,
      provenance: null,
    };
  }

  const validation = validateScenarioDefinition(transport.parsed.definition, current.engine.snapshot);
  if (!validation.valid || !validation.definition) {
    return invalidRun(id, current.baseline, current.engine, validation.issues);
  }
  return runValidated(current.engine, validation.definition).dto;
}

export async function executeScenarioRebase(input: unknown, dependencies: ScenarioExecutionDependencies): Promise<ScenarioRebaseDTO> {
  const current = await currentBaseline(dependencies);
  if (!current.engine || !current.baseline) {
    return {
      status: "unauthorized", baseline: null, baselineSummary: null, definition: null,
      issues: [issue("request.auth", "invalid_definition", "Authenticated household authority is required.")],
    };
  }
  const transport = parseSubmission(input);
  if (!transport.parsed || !record(transport.parsed.definition)) {
    return {
      status: "invalid", baseline: current.baseline, baselineSummary: scenarioEngineSummary(current.engine), definition: null,
      issues: transport.issues.length ? transport.issues : [issue("request.definition", "invalid_definition", "Scenario definition must be an object.")],
    };
  }
  const candidate = structuredClone(transport.parsed.definition) as Row;
  const existingReference = record(candidate.baselineReference) ? candidate.baselineReference : {};
  candidate.baselineReference = { ...existingReference, fingerprint: current.baseline.fingerprint };
  const validation = validateScenarioDefinition(candidate, current.engine.snapshot);
  if (!validation.valid || !validation.definition) {
    return {
      status: validation.issues.some((item) => item.code === "missing_entity") ? "unresolved" : "invalid",
      baseline: current.baseline,
      baselineSummary: scenarioEngineSummary(current.engine),
      definition: null,
      issues: validation.issues,
    };
  }
  return {
    status: "rebased",
    baseline: current.baseline,
    baselineSummary: scenarioEngineSummary(current.engine),
    definition: validation.definition,
    issues: [],
  };
}

export async function executeScenarioPairComparison(
  input: unknown,
  dependencies: ScenarioExecutionDependencies,
): Promise<ScenarioPairComparisonDTO> {
  const current = await currentBaseline(dependencies);
  if (!current.engine || !current.baseline) {
    return { status: "unauthorized", baseline: null, leftScenarioId: null, rightScenarioId: null, leftSummary: null, rightSummary: null, comparison: null, issues: [issue("request.auth", "invalid_definition", "Authenticated household authority is required.")] };
  }
  if (!record(input)) {
    return { status: "invalid", baseline: current.baseline, leftScenarioId: null, rightScenarioId: null, leftSummary: null, rightSummary: null, comparison: null, issues: [issue("request", "invalid_definition", "Comparison request must be an object.")] };
  }
  const rootIssues: ScenarioValidationIssue[] = [];
  exactKeys(input, ["left", "right"], "request", rootIssues);
  const left = parseSubmission(input.left);
  const right = parseSubmission(input.right);
  const issues = [...rootIssues, ...left.issues, ...right.issues];
  if (!left.parsed || !right.parsed || issues.length) {
    return { status: "invalid", baseline: current.baseline, leftScenarioId: scenarioId(left.parsed?.definition), rightScenarioId: scenarioId(right.parsed?.definition), leftSummary: null, rightSummary: null, comparison: null, issues };
  }
  if (staleSubmission(left.parsed, current.baseline) || staleSubmission(right.parsed, current.baseline)) {
    return {
      status: "stale_baseline", baseline: current.baseline, leftScenarioId: scenarioId(left.parsed.definition), rightScenarioId: scenarioId(right.parsed.definition),
      leftSummary: null, rightSummary: null, comparison: null,
      issues: [issue("request.baselineFingerprint", "invalid_definition", "Both scenarios must share the same current baseline fingerprint and policy basis.")],
    };
  }
  const leftValidation = validateScenarioDefinition(left.parsed.definition, current.engine.snapshot);
  const rightValidation = validateScenarioDefinition(right.parsed.definition, current.engine.snapshot);
  if (!leftValidation.valid || !leftValidation.definition || !rightValidation.valid || !rightValidation.definition) {
    return {
      status: "invalid", baseline: current.baseline, leftScenarioId: scenarioId(left.parsed.definition), rightScenarioId: scenarioId(right.parsed.definition),
      leftSummary: null, rightSummary: null, comparison: null,
      issues: [...leftValidation.issues, ...rightValidation.issues],
    };
  }
  const leftRun = runValidated(current.engine, leftValidation.definition);
  const rightRun = runValidated(current.engine, rightValidation.definition);
  if (!leftRun.scenarioEngine || !rightRun.scenarioEngine) {
    return {
      status: "invalid", baseline: current.baseline, leftScenarioId: leftValidation.definition.scenarioId, rightScenarioId: rightValidation.definition.scenarioId,
      leftSummary: leftRun.dto.scenarioSummary, rightSummary: rightRun.dto.scenarioSummary, comparison: null,
      issues: [...leftRun.dto.issues, ...rightRun.dto.issues],
    };
  }
  const assessment = assessRecommendationRefresh(leftRun.scenarioEngine, rightRun.scenarioEngine);
  return {
    status: "valid",
    baseline: current.baseline,
    leftScenarioId: leftValidation.definition.scenarioId,
    rightScenarioId: rightValidation.definition.scenarioId,
    leftSummary: scenarioEngineSummary(leftRun.scenarioEngine),
    rightSummary: scenarioEngineSummary(rightRun.scenarioEngine),
    comparison: scenarioRefreshComparison(assessment, leftRun.scenarioEngine, rightRun.scenarioEngine),
    issues: [],
  };
}

export function scenarioLabBootstrap(engine: MoneyPriorityEngineResult): ScenarioLabBootstrap {
  const baseline = scenarioBaselineDescriptor(engine);
  return {
    baseline,
    baselineSummary: scenarioEngineSummary(engine),
    entities: {
      people: engine.snapshot.people.map((item) => ({ id: item.id, label: item.displayName })),
      income: engine.snapshot.income.map((item) => ({ id: item.id, label: item.name })),
      expenses: engine.snapshot.expenses.map((item) => ({ id: item.id, label: item.name })),
      debts: engine.snapshot.debts.map((item) => ({ id: item.id, label: item.name })),
      goals: engine.snapshot.goals.map((item) => ({ id: item.id, label: item.name })),
      retirementAccounts: engine.snapshot.retirementAccounts.map((item) => ({ id: item.id, label: item.name })),
      insuranceExposures: engine.snapshot.insuranceExposures.map((item) => ({ id: item.id, label: item.name })),
    },
  };
}
