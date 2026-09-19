import { SCENARIO_DEFINITION_VERSION, type ScenarioDefinition } from "./scenario-definition.ts";
import type { ScenarioBaselineDescriptor, ScenarioRunDTO } from "./scenario-app-contract.ts";

export type ScenarioDraft = {
  localId: string;
  title: string;
  definition: ScenarioDefinition;
  baseline: ScenarioBaselineDescriptor;
  dirty: boolean;
  result: ScenarioRunDTO | null;
};

export function createScenarioDraft(localId: string, baseline: ScenarioBaselineDescriptor, title = "New scenario"): ScenarioDraft {
  return {
    localId,
    title,
    baseline,
    dirty: false,
    result: null,
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
  return { ...draft, title, definition, dirty: true, result: null };
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
  return Boolean(a.result && b.result
    && a.result.status !== "stale_baseline" && b.result.status !== "stale_baseline"
    && a.baseline.fingerprint === b.baseline.fingerprint
    && JSON.stringify(a.baseline.policyBasis) === JSON.stringify(b.baseline.policyBasis));
}
