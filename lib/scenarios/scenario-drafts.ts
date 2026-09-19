import { SCENARIO_DEFINITION_VERSION, type ScenarioDefinition } from "./scenario-definition.ts";
import type {
  ScenarioBaselineDescriptor,
  ScenarioRunDTO,
  SpecializedScenarioRunDTO,
  SpecializedScenarioSubmission,
} from "./scenario-app-contract.ts";
import {
  SPECIALIZED_SCENARIO_DEFINITION_VERSION,
  type ScenarioOperationEventLink,
  type ScenarioSpecializedIntent,
} from "./scenario-specialized-contract.ts";
import type { MoneyPlanOverride } from "../calculations/money-priority-user-plan.ts";

export type ScenarioDraft = {
  localId: string;
  title: string;
  definition: ScenarioDefinition;
  baseline: ScenarioBaselineDescriptor;
  dirty: boolean;
  result: ScenarioRunDTO | null;
  specialized: ScenarioSpecializedIntent | null;
  operationEventLinks: ScenarioOperationEventLink[];
  yourPlanOverrides: MoneyPlanOverride[];
  specializedResult: SpecializedScenarioRunDTO | null;
};

export function createScenarioDraft(localId: string, baseline: ScenarioBaselineDescriptor, title = "New scenario"): ScenarioDraft {
  return {
    localId,
    title,
    baseline,
    dirty: false,
    result: null,
    specialized: null,
    operationEventLinks: [],
    yourPlanOverrides: [],
    specializedResult: null,
    definition: {
      version: SCENARIO_DEFINITION_VERSION,
      scenarioId: localId,
      baselineReference: { fingerprint: baseline.fingerprint, referenceId: null },
      recurringOverrides: [],
      oneTimeEvents: [],
      specializedIntent: null,
    },
  };
}

export function editScenarioDraft(draft: ScenarioDraft, definition: ScenarioDefinition, title = draft.title): ScenarioDraft {
  return { ...draft, title, definition, dirty: true, result: null, specializedResult: null };
}

export function resetScenarioDraft(draft: ScenarioDraft, baseline: ScenarioBaselineDescriptor): ScenarioDraft {
  return createScenarioDraft(draft.localId, baseline, draft.title);
}

export function duplicateScenarioDraft(draft: ScenarioDraft, localId: string): ScenarioDraft {
  return {
    ...draft,
    localId,
    title: draft.title + " copy",
    dirty: true,
    result: null,
    specializedResult: null,
    specialized: draft.specialized ? structuredClone(draft.specialized) : null,
    operationEventLinks: structuredClone(draft.operationEventLinks),
    yourPlanOverrides: structuredClone(draft.yourPlanOverrides),
    definition: {
      ...structuredClone(draft.definition),
      scenarioId: localId,
    },
  };
}

export function discardScenarioDraft(drafts: readonly ScenarioDraft[], localId: string): ScenarioDraft[] {
  return drafts.filter((draft) => draft.localId !== localId);
}

export function scenarioDraftCanCompare(a: ScenarioDraft, b: ScenarioDraft): boolean {
  return Boolean(!a.specialized && !b.specialized
    && a.yourPlanOverrides.length === 0 && b.yourPlanOverrides.length === 0
    && a.result && b.result
    && a.result.status !== "stale_baseline" && b.result.status !== "stale_baseline"
    && a.baseline.fingerprint === b.baseline.fingerprint
    && JSON.stringify(a.baseline.policyBasis) === JSON.stringify(b.baseline.policyBasis));
}


export function setScenarioSpecializedIntent(
  draft: ScenarioDraft,
  specialized: ScenarioSpecializedIntent | null,
): ScenarioDraft {
  const next = editScenarioDraft(draft, {
    ...draft.definition,
    specializedIntent: specialized
      ? { type: specialized.type, intentId: specialized.eventId }
      : null,
  });
  return {
    ...next,
    specialized: specialized ? structuredClone(specialized) : null,
    specializedResult: null,
  };
}

export function setScenarioOperationEventLink(
  draft: ScenarioDraft,
  operationId: string,
  eventId: string,
): ScenarioDraft {
  const trimmed = eventId.trim();
  const remaining = draft.operationEventLinks.filter((link) => link.operationId !== operationId);
  return {
    ...draft,
    operationEventLinks: trimmed ? [...remaining, { operationId, eventId: trimmed }] : remaining,
    dirty: true,
    result: null,
    specializedResult: null,
  };
}

export function upsertScenarioPlanOverride(
  draft: ScenarioDraft,
  allocationId: string,
  monthlyAmount: number,
): ScenarioDraft {
  const remaining = draft.yourPlanOverrides.filter((override) => override.allocationId !== allocationId);
  return {
    ...draft,
    yourPlanOverrides: [...remaining, { allocationId, monthlyAmount }],
    dirty: true,
    result: null,
    specializedResult: null,
  };
}

export function removeScenarioPlanOverride(draft: ScenarioDraft, allocationId: string): ScenarioDraft {
  return {
    ...draft,
    yourPlanOverrides: draft.yourPlanOverrides.filter((override) => override.allocationId !== allocationId),
    dirty: true,
    result: null,
    specializedResult: null,
  };
}

export function specializedScenarioSubmission(draft: ScenarioDraft): SpecializedScenarioSubmission {
  return {
    definition: {
      version: SPECIALIZED_SCENARIO_DEFINITION_VERSION,
      genericDefinition: draft.definition,
      specialized: draft.specialized,
      operationEventLinks: draft.operationEventLinks,
      yourPlanOverrides: draft.yourPlanOverrides,
    },
    baselineFingerprint: draft.baseline.fingerprint,
    baselinePolicyBasis: draft.baseline.policyBasis,
  };
}
