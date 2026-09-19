"use server";

import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import {
  executeScenarioPairComparison,
  executeScenarioRebase,
  executeScenarioRun,
  type ScenarioExecutionDependencies,
} from "@/lib/scenarios/scenario-execution";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function dependencies(): ScenarioExecutionDependencies {
  return {
    resolveAuthority: async () => {
      const authority = await resolveScenarioHouseholdAuthority();
      return { authenticated: authority.authenticated, householdId: authority.householdId };
    },
    loadSnapshot: loadMoneyPrioritySnapshot,
    asOfDate: todayUtc,
  };
}

export async function runScenarioAction(input: unknown) {
  return executeScenarioRun(input, dependencies());
}

export async function rebaseScenarioAction(input: unknown) {
  return executeScenarioRebase(input, dependencies());
}

export async function compareScenariosAction(input: unknown) {
  return executeScenarioPairComparison(input, dependencies());
}
