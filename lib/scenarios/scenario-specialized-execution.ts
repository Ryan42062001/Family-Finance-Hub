import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import { moneyPrioritySnapshotToRaw } from "../calculations/money-priority-raw-adapter.ts";
import { deriveRecommendedPlanAllocations } from "../calculations/money-priority-user-plan.ts";
import { validateScenarioDefinition } from "./scenario-definition.ts";
import {
  detectScenarioCompositionConflicts,
  type SpecializedScenarioDefinition,
} from "./scenario-specialized-contract.ts";
import { runSpecializedScenario } from "./scenario-specialized-runner.ts";
import {
  scenarioBaselineDescriptor,
  sameScenarioPolicyBasis,
} from "./scenario-fingerprint.ts";
import {
  scenarioEngineSummary,
  scenarioLabBootstrap,
  scenarioRefreshComparison,
  type ScenarioExecutionDependencies,
} from "./scenario-execution.ts";
import type {
  ScenarioBaselineDescriptor,
  ScenarioPolicyBasis,
  ScenarioTransportIssue,
  SpecializedScenarioRebaseDTO,
  SpecializedScenarioRunDTO,
} from "./scenario-app-contract.ts";

type Row = Record<string, unknown>;

type ParsedSubmission = {
  definition: SpecializedScenarioDefinition;
  baselineFingerprint: string;
  baselinePolicyBasis: ScenarioPolicyBasis;
};

function record(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function issue(path: string, code: string, message: string): ScenarioTransportIssue {
  return { path, code, message };
}

function exactKeys(value: Row, allowed: readonly string[], path: string, issues: ScenarioTransportIssue[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issues.push(issue(path + "." + key, "unknown_field", key + " is not accepted by the specialized Scenario Lab transport."));
  }
}

function parsePolicyBasis(value: unknown, issues: ScenarioTransportIssue[]): ScenarioPolicyBasis | null {
  if (!record(value)) {
    issues.push(issue("request.baselinePolicyBasis", "invalid_definition", "baselinePolicyBasis must be an object."));
    return null;
  }
  exactKeys(value, ["moneyPriorityPolicyVersion", "planningAssumptionsVersion", "taxPolicyVersion", "taxYear", "asOfDate"], "request.baselinePolicyBasis", issues);
  const strings = ["moneyPriorityPolicyVersion", "planningAssumptionsVersion", "taxPolicyVersion", "asOfDate"] as const;
  for (const field of strings) {
    if (typeof value[field] !== "string" || !String(value[field]).trim()) {
      issues.push(issue("request.baselinePolicyBasis." + field, "invalid_string", field + " must be a nonempty string."));
    }
  }
  if (!Number.isInteger(value.taxYear)) issues.push(issue("request.baselinePolicyBasis.taxYear", "invalid_number", "taxYear must be an integer."));
  if (issues.length) return null;
  return value as unknown as ScenarioPolicyBasis;
}

function validateSpecializedShape(value: unknown, issues: ScenarioTransportIssue[]): value is SpecializedScenarioDefinition {
  if (!record(value)) {
    issues.push(issue("request.definition", "invalid_definition", "Specialized scenario definition must be an object."));
    return false;
  }
  exactKeys(value, ["version", "genericDefinition", "specialized", "operationEventLinks", "yourPlanOverrides"], "request.definition", issues);
  if (!record(value.genericDefinition)) issues.push(issue("request.definition.genericDefinition", "invalid_definition", "genericDefinition must be an object."));
  if (!Array.isArray(value.operationEventLinks)) {
    issues.push(issue("request.definition.operationEventLinks", "invalid_definition", "operationEventLinks must be an array."));
  } else {
    value.operationEventLinks.forEach((link, index) => {
      if (!record(link) || typeof link.operationId !== "string" || typeof link.eventId !== "string") {
        issues.push(issue(`request.definition.operationEventLinks[${index}]`, "invalid_definition", "Operation event links require string operationId and eventId values."));
      }
    });
  }
  if (!Array.isArray(value.yourPlanOverrides)) {
    issues.push(issue("request.definition.yourPlanOverrides", "invalid_definition", "yourPlanOverrides must be an array."));
  } else {
    value.yourPlanOverrides.forEach((override, index) => {
      if (!record(override) || typeof override.allocationId !== "string" || typeof override.monthlyAmount !== "number" || !Number.isFinite(override.monthlyAmount)) {
        issues.push(issue(`request.definition.yourPlanOverrides[${index}]`, "invalid_definition", "Your Plan overrides require a stable allocationId and finite monthlyAmount."));
      }
    });
  }
  if (value.specialized !== null) {
    if (!record(value.specialized)) {
      issues.push(issue("request.definition.specialized", "invalid_definition", "specialized must be null or an object."));
    } else if (!["home", "vehicle", "windfall"].includes(String(value.specialized.type))
      || typeof value.specialized.eventId !== "string") {
      issues.push(issue("request.definition.specialized", "invalid_definition", "Specialized intent requires home, vehicle, or windfall type plus a stable eventId."));
    } else if ((value.specialized.type === "home" || value.specialized.type === "vehicle") && !record(value.specialized.scenario)) {
      issues.push(issue("request.definition.specialized.scenario", "invalid_definition", "Home/Vehicle specialized intent requires a scenario object."));
    } else if (value.specialized.type === "windfall" && !record(value.specialized.input)) {
      issues.push(issue("request.definition.specialized.input", "invalid_definition", "Windfall specialized intent requires an input object."));
    }
  }
  return issues.length === 0;
}

function parseSubmission(value: unknown): { parsed: ParsedSubmission | null; issues: ScenarioTransportIssue[] } {
  const issues: ScenarioTransportIssue[] = [];
  if (!record(value)) return { parsed: null, issues: [issue("request", "invalid_definition", "Specialized Scenario Lab request must be an object.")] };
  exactKeys(value, ["definition", "baselineFingerprint", "baselinePolicyBasis"], "request", issues);
  if (typeof value.baselineFingerprint !== "string" || !value.baselineFingerprint.trim()) {
    issues.push(issue("request.baselineFingerprint", "invalid_string", "baselineFingerprint must be a nonempty opaque string."));
  }
  const policyBasis = parsePolicyBasis(value.baselinePolicyBasis, issues);
  const validDefinition = validateSpecializedShape(value.definition, issues);
  if (!validDefinition || !policyBasis || issues.length) return { parsed: null, issues };
  return {
    parsed: {
      definition: structuredClone(value.definition as SpecializedScenarioDefinition),
      baselineFingerprint: value.baselineFingerprint as string,
      baselinePolicyBasis: policyBasis,
    },
    issues,
  };
}

async function currentBaseline(dependencies: ScenarioExecutionDependencies): Promise<{
  engine: MoneyPriorityEngineResult | null;
  baseline: ScenarioBaselineDescriptor | null;
}> {
  const authority = await dependencies.resolveAuthority();
  if (!authority.authenticated || !authority.householdId) return { engine: null, baseline: null };
  const snapshot = await dependencies.loadSnapshot(authority.householdId);
  const engine = runMoneyPriorityEngine(moneyPrioritySnapshotToRaw(snapshot), dependencies.asOfDate());
  return { engine, baseline: scenarioBaselineDescriptor(engine) };
}

function scenarioId(definition: SpecializedScenarioDefinition | null): string | null {
  return definition?.genericDefinition?.scenarioId ?? null;
}

function staleSubmission(parsed: ParsedSubmission, current: ScenarioBaselineDescriptor): boolean {
  return parsed.baselineFingerprint !== current.fingerprint
    || parsed.definition.genericDefinition.baselineReference.fingerprint !== current.fingerprint
    || !sameScenarioPolicyBasis(parsed.baselinePolicyBasis, current.policyBasis);
}

function emptyRun(
  status: SpecializedScenarioRunDTO["status"],
  current: { engine: MoneyPriorityEngineResult | null; baseline: ScenarioBaselineDescriptor | null },
  id: string | null,
  issues: ScenarioTransportIssue[],
): SpecializedScenarioRunDTO {
  return {
    status,
    scenarioId: id,
    baseline: current.baseline,
    baselineSummary: current.engine ? scenarioEngineSummary(current.engine) : null,
    genericSummary: null,
    genericComparison: null,
    specialized: null,
    yourPlan: null,
    planAllocations: [],
    conflicts: null,
    issues,
    provenance: null,
  };
}

function appIssues(values: readonly { path: string; code: string; message: string }[]): ScenarioTransportIssue[] {
  return values.map((value) => ({ path: value.path, code: value.code, message: value.message }));
}

export async function executeSpecializedScenarioRun(
  input: unknown,
  dependencies: ScenarioExecutionDependencies,
): Promise<SpecializedScenarioRunDTO> {
  const current = await currentBaseline(dependencies);
  if (!current.engine || !current.baseline) {
    return emptyRun("unauthorized", current, null, [
      issue("request.auth", "unauthorized", "Authenticated household authority is required."),
    ]);
  }

  const transport = parseSubmission(input);
  if (!transport.parsed) return emptyRun("invalid", current, null, transport.issues);
  const id = scenarioId(transport.parsed.definition);

  if (staleSubmission(transport.parsed, current.baseline)) {
    return emptyRun("stale_baseline", current, id, [
      issue("request.baselineFingerprint", "stale_baseline", "The household financial basis or policy basis changed. Explicit rebase is required before specialized execution."),
    ]);
  }

  const genericValidation = validateScenarioDefinition(
    transport.parsed.definition.genericDefinition,
    current.engine.snapshot,
  );
  if (!genericValidation.valid || !genericValidation.definition) {
    return emptyRun("invalid", current, id, appIssues(genericValidation.issues));
  }

  const definition: SpecializedScenarioDefinition = {
    ...transport.parsed.definition,
    genericDefinition: genericValidation.definition,
  };

  let run;
  try {
    run = runSpecializedScenario(current.engine, definition);
  } catch {
    return emptyRun("invalid", current, id, [
      issue("request.definition.specialized", "invalid_specialized_payload", "The specialized scenario payload could not be evaluated. Review the specialized fields and try again."),
    ]);
  }

  const genericEngine = run.genericEngineResult;
  const genericComparison = genericEngine && run.genericComparison
    ? scenarioRefreshComparison(run.genericComparison, current.engine, genericEngine)
    : null;

  let specialized: SpecializedScenarioRunDTO["specialized"] = null;
  if (run.specialized?.type === "home") {
    specialized = {
      type: "home",
      eventId: run.specialized.eventId,
      result: run.specialized.result,
      postEngineSummary: run.specialized.postEngine ? scenarioEngineSummary(run.specialized.postEngine) : null,
      comparison: genericEngine && run.specialized.postEngine && run.specialized.comparison
        ? scenarioRefreshComparison(run.specialized.comparison, genericEngine, run.specialized.postEngine)
        : null,
      stressedPostEngineSummary: run.specialized.stressedPostEngine ? scenarioEngineSummary(run.specialized.stressedPostEngine) : null,
      stressedComparison: genericEngine && run.specialized.stressedPostEngine && run.specialized.stressedComparison
        ? scenarioRefreshComparison(run.specialized.stressedComparison, genericEngine, run.specialized.stressedPostEngine)
        : null,
    };
  } else if (run.specialized?.type === "vehicle") {
    specialized = {
      type: "vehicle",
      eventId: run.specialized.eventId,
      result: run.specialized.result,
      postEngineSummary: run.specialized.postEngine ? scenarioEngineSummary(run.specialized.postEngine) : null,
      comparison: genericEngine && run.specialized.postEngine && run.specialized.comparison
        ? scenarioRefreshComparison(run.specialized.comparison, genericEngine, run.specialized.postEngine)
        : null,
    };
  } else if (run.specialized?.type === "windfall") {
    specialized = {
      type: "windfall",
      eventId: run.specialized.eventId,
      result: run.specialized.result,
    };
  }

  const planEngine = !genericEngine
    ? null
    : run.specialized?.type === "home" || run.specialized?.type === "vehicle"
      ? run.specialized.postEngine
      : genericEngine;

  return {
    status: run.status,
    scenarioId: id,
    baseline: current.baseline,
    baselineSummary: scenarioEngineSummary(current.engine),
    genericSummary: genericEngine ? scenarioEngineSummary(genericEngine) : null,
    genericComparison,
    specialized,
    yourPlan: run.yourPlan ? {
      engineBasis: run.yourPlan.engineBasis,
      result: run.yourPlan.result,
      refresh: {
        state: run.yourPlan.refresh.state,
        reasons: [...run.yourPlan.refresh.reasons],
        overrideStatuses: run.yourPlan.refresh.overrideStatuses.map((item) => ({ ...item })),
      },
    } : null,
    planAllocations: planEngine ? deriveRecommendedPlanAllocations(planEngine).map((item) => ({ ...item })) : [],
    conflicts: {
      valid: run.conflicts.valid,
      issues: run.conflicts.issues.map((item) => ({ ...item })),
    },
    issues: appIssues(run.issues),
    provenance: {
      hypothetical: true,
      specializedDefinitionVersion: run.provenance.specializedDefinitionVersion,
      specializedType: run.provenance.specializedType,
      specializedEventId: run.provenance.specializedEventId,
      genericRecurringOverrideIds: [...run.provenance.genericRecurringOverrideIds],
      genericOneTimeEventIds: [...run.provenance.genericOneTimeEventIds],
    },
  };
}

function missingStableReferences(
  definition: SpecializedScenarioDefinition,
  engine: MoneyPriorityEngineResult,
): ScenarioTransportIssue[] {
  const specialized = definition.specialized;
  if (!specialized || specialized.type === "windfall") return [];

  const debtIds = new Set(engine.snapshot.debts.map((item) => item.id));
  const expenseIds = new Set(engine.snapshot.expenses.map((item) => item.id));
  const goalIds = new Set(engine.snapshot.goals.map((item) => item.id));
  const issues: ScenarioTransportIssue[] = [];

  const relatedGoalId = specialized.scenario.relatedGoalId ?? null;
  if (relatedGoalId && !goalIds.has(relatedGoalId)) {
    issues.push(issue("request.definition.specialized.scenario.relatedGoalId", "missing_entity", "The specialized scenario references a goal stable ID that no longer exists."));
  }

  for (const id of specialized.ownedStableIds?.debtIds ?? []) {
    if (!debtIds.has(id)) issues.push(issue("request.definition.specialized.ownedStableIds.debtIds", "missing_entity", "Adapter-owned debt stable ID " + id + " no longer exists."));
  }
  for (const id of specialized.ownedStableIds?.expenseIds ?? []) {
    if (!expenseIds.has(id)) issues.push(issue("request.definition.specialized.ownedStableIds.expenseIds", "missing_entity", "Adapter-owned expense stable ID " + id + " no longer exists."));
  }
  for (const id of specialized.ownedStableIds?.goalIds ?? []) {
    if (!goalIds.has(id)) issues.push(issue("request.definition.specialized.ownedStableIds.goalIds", "missing_entity", "Adapter-owned goal stable ID " + id + " no longer exists."));
  }
  return issues;
}

export async function executeSpecializedScenarioRebase(
  input: unknown,
  dependencies: ScenarioExecutionDependencies,
): Promise<SpecializedScenarioRebaseDTO> {
  const current = await currentBaseline(dependencies);
  if (!current.engine || !current.baseline) {
    return {
      status: "unauthorized",
      baseline: null,
      baselineSummary: null,
      bootstrap: null,
      definition: null,
      issues: [issue("request.auth", "unauthorized", "Authenticated household authority is required.")],
    };
  }

  const transport = parseSubmission(input);
  if (!transport.parsed) {
    return {
      status: "invalid",
      baseline: current.baseline,
      baselineSummary: scenarioEngineSummary(current.engine),
      bootstrap: scenarioLabBootstrap(current.engine),
      definition: null,
      issues: transport.issues,
    };
  }

  const candidate = structuredClone(transport.parsed.definition);
  candidate.genericDefinition = {
    ...candidate.genericDefinition,
    baselineReference: {
      ...candidate.genericDefinition.baselineReference,
      fingerprint: current.baseline.fingerprint,
    },
  };

  const genericValidation = validateScenarioDefinition(candidate.genericDefinition, current.engine.snapshot);
  if (!genericValidation.valid || !genericValidation.definition) {
    const validationIssues = appIssues(genericValidation.issues);
    return {
      status: validationIssues.some((item) => item.code === "missing_entity") ? "unresolved" : "invalid",
      baseline: current.baseline,
      baselineSummary: scenarioEngineSummary(current.engine),
      bootstrap: scenarioLabBootstrap(current.engine),
      definition: null,
      issues: validationIssues,
    };
  }
  candidate.genericDefinition = genericValidation.definition;

  const missing = missingStableReferences(candidate, current.engine);
  if (missing.length) {
    return {
      status: "unresolved",
      baseline: current.baseline,
      baselineSummary: scenarioEngineSummary(current.engine),
      bootstrap: scenarioLabBootstrap(current.engine),
      definition: null,
      issues: missing,
    };
  }

  const conflicts = detectScenarioCompositionConflicts(candidate);
  if (!conflicts.valid) {
    return {
      status: "invalid",
      baseline: current.baseline,
      baselineSummary: scenarioEngineSummary(current.engine),
      bootstrap: scenarioLabBootstrap(current.engine),
      definition: null,
      issues: appIssues(conflicts.issues),
    };
  }

  return {
    status: "rebased",
    baseline: current.baseline,
    baselineSummary: scenarioEngineSummary(current.engine),
    bootstrap: scenarioLabBootstrap(current.engine),
    definition: candidate,
    issues: [],
  };
}
