import { SCENARIO_DEFINITION_VERSION, type ScenarioDefinition } from "./scenario-definition.ts";
import type {
  ScenarioBaselineDescriptor,
  ScenarioRunDTO,
  SpecializedScenarioRunDTO,
} from "./scenario-app-contract.ts";
import type {
  ScenarioOperationEventLink,
  ScenarioSpecializedIntent,
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
