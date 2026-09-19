import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "../calculations/money-priority-policy.ts";
import { MoneyPrioritySnapshotValidationError, type MoneyPriorityRawSnapshot } from "../calculations/money-priority-snapshot.ts";
import { applyScenarioOverlay, type ScenarioOverlayProvenance } from "./scenario-overlay.ts";
import type { ScenarioBaselineReference, ScenarioValidationIssue } from "./scenario-definition.ts";

export type ScenarioRunStatus = "valid" | "more_information_needed" | "invalid";

export type ScenarioPolicyBasis = {
  moneyPriorityPolicyVersion: string;
  planningAssumptionsVersion: string;
  taxPolicyVersion: string;
  taxYear: number;
  asOfDate: string;
};

export type ScenarioRunProvenance = {
  baselineReference: ScenarioBaselineReference | null;
  policyBasis: ScenarioPolicyBasis;
  overlay: ScenarioOverlayProvenance | null;
};

export type ScenarioRunResult = {
  status: ScenarioRunStatus;
  baselineEngineResult: MoneyPriorityEngineResult;
  scenarioEngineResult: MoneyPriorityEngineResult | null;
  issues: ScenarioValidationIssue[];
  provenance: ScenarioRunProvenance;
};

function policyBasis(engine: MoneyPriorityEngineResult): ScenarioPolicyBasis {
  return {
    moneyPriorityPolicyVersion: engine.policyVersion,
    planningAssumptionsVersion: engine.planningAssumptionsVersion,
    taxPolicyVersion: engine.taxPolicyVersion,
    taxYear: engine.taxYear,
    asOfDate: engine.asOfDate,
  };
}

function needsMoreInformation(engine: MoneyPriorityEngineResult): boolean {
  if (engine.recommendations.some((item) => item.state === "more_information_needed")) return true;
  if (engine.secure.recommendations.some((item) => item.state === "more_information_needed")) return true;
  if (engine.build.goalIntelligence.some((item) => item.state === "more_information_needed")) return true;
  if (engine.build.retirementAccounts.opportunities.some((item) => item.state === "more_information_needed")) return true;
  return false;
}

function invalid(
  baseline: MoneyPriorityEngineResult,
  issues: ScenarioValidationIssue[],
  baselineReference: ScenarioBaselineReference | null,
): ScenarioRunResult {
  return {
    status: "invalid",
    baselineEngineResult: baseline,
    scenarioEngineResult: null,
    issues,
    provenance: { baselineReference, policyBasis: policyBasis(baseline), overlay: null },
  };
}

export function runMoneyPriorityScenario(
  baseline: MoneyPriorityEngineResult,
  definition: unknown,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): ScenarioRunResult {
  const baselineReference = definition && typeof definition === "object" && !Array.isArray(definition)
    && "baselineReference" in definition && (definition as { baselineReference?: unknown }).baselineReference
    && typeof (definition as { baselineReference?: unknown }).baselineReference === "object"
    ? (definition as { baselineReference: ScenarioBaselineReference }).baselineReference
    : null;

  if (policy.version !== baseline.policyVersion) {
    return invalid(baseline, [{
      path: "scenario.policy",
      code: "invalid_definition",
      message: "Scenario rerun policy must match the baseline Money Priority policy version.",
    }], baselineReference);
  }

  const overlay = applyScenarioOverlay(baseline.snapshot, definition);
  if (!overlay.ok) return invalid(baseline, overlay.issues, overlay.definition?.baselineReference ?? baselineReference);

  try {
    const scenarioEngineResult = runMoneyPriorityEngine(
      structuredClone(overlay.rawSnapshot) as MoneyPriorityRawSnapshot,
      baseline.asOfDate,
      policy,
    );
    return {
      status: needsMoreInformation(scenarioEngineResult) ? "more_information_needed" : "valid",
      baselineEngineResult: baseline,
      scenarioEngineResult,
      issues: [],
      provenance: {
        baselineReference: overlay.definition.baselineReference,
        policyBasis: policyBasis(scenarioEngineResult),
        overlay: overlay.provenance,
      },
    };
  } catch (error) {
    const message = error instanceof MoneyPrioritySnapshotValidationError
      ? error.issues.map((issue) => issue.path + ": " + issue.message).join("; ")
      : error instanceof Error ? error.message : "Scenario rerun failed validation.";
    return invalid(baseline, [{
      path: "scenario.overlay",
      code: "invalid_definition",
      message,
    }], overlay.definition.baselineReference);
  }
}
