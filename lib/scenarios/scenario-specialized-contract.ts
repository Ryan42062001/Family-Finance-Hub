import type { HomePurchaseScenario } from "../calculations/home-affordability.ts";
import type { VehiclePurchaseScenario } from "../calculations/vehicle-affordability.ts";
import type { WindfallInput } from "../calculations/money-priority-windfall.ts";
import type { MoneyPlanOverride } from "../calculations/money-priority-user-plan.ts";
import type {
  ScenarioDefinition,
  ScenarioOneTimeEvent,
  ScenarioRecurringOverride,
} from "./scenario-definition.ts";

export const SPECIALIZED_SCENARIO_DEFINITION_VERSION = "scenario-specialized-v1" as const;

export type SpecializedOwnedStableIds = {
  debtIds?: readonly string[];
  expenseIds?: readonly string[];
  goalIds?: readonly string[];
};

export type HomeSpecializedIntent = {
  type: "home";
  eventId: string;
  scenario: HomePurchaseScenario;
  ownedStableIds?: SpecializedOwnedStableIds;
};

export type VehicleSpecializedIntent = {
  type: "vehicle";
  eventId: string;
  scenario: VehiclePurchaseScenario;
  ownedStableIds?: SpecializedOwnedStableIds;
};

export type WindfallSpecializedIntent = {
  type: "windfall";
  eventId: string;
  input: WindfallInput;
};

export type ScenarioSpecializedIntent =
  | HomeSpecializedIntent
  | VehicleSpecializedIntent
  | WindfallSpecializedIntent;

export type ScenarioOperationEventLink = {
  operationId: string;
  eventId: string;
};

export type SpecializedScenarioDefinition = {
  version: typeof SPECIALIZED_SCENARIO_DEFINITION_VERSION;
  genericDefinition: ScenarioDefinition;
  specialized: ScenarioSpecializedIntent | null;
  operationEventLinks: readonly ScenarioOperationEventLink[];
  yourPlanOverrides: readonly MoneyPlanOverride[];
};

export type ScenarioCompositionIssueCode =
  | "invalid_specialized_version"
  | "invalid_event_id"
  | "specialized_intent_mismatch"
  | "duplicate_event_link"
  | "unknown_operation_link"
  | "ambiguous_event_ownership"
  | "duplicate_event_representation"
  | "stable_entity_overlap"
  | "duplicate_plan_override"
  | "specialized_engine_unavailable"
  | "invalid_plan_override";

export type ScenarioCompositionIssue = {
  path: string;
  code: ScenarioCompositionIssueCode;
  message: string;
};

export type ScenarioConflictResult = {
  valid: boolean;
  issues: ScenarioCompositionIssue[];
};

type ScenarioOperation = ScenarioRecurringOverride | ScenarioOneTimeEvent;

function operationKey(operation: ScenarioOperation): string {
  return operation.type + ":" + operation.id;
}

function sortedUnique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort();
}

function issueSort(a: ScenarioCompositionIssue, b: ScenarioCompositionIssue): number {
  return a.path.localeCompare(b.path) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message);
}

function isAmbiguousWithoutEventLink(
  specializedType: ScenarioSpecializedIntent["type"],
  operation: ScenarioOperation,
): boolean {
  if (specializedType === "windfall") return operation.type === "cash_inflow";
  return operation.type === "cash_inflow"
    || operation.type === "cash_use"
    || operation.type === "synthetic_expense";
}

function ownedIds(specialized: ScenarioSpecializedIntent): {
  debts: Set<string>;
  expenses: Set<string>;
  goals: Set<string>;
} {
  if (specialized.type === "windfall") {
    return { debts: new Set(), expenses: new Set(), goals: new Set() };
  }
  const goals = sortedUnique(specialized.ownedStableIds?.goalIds);
  const relatedGoalId = specialized.scenario.relatedGoalId ?? null;
  if (relatedGoalId) goals.push(relatedGoalId);
  return {
    debts: new Set(sortedUnique(specialized.ownedStableIds?.debtIds)),
    expenses: new Set(sortedUnique(specialized.ownedStableIds?.expenseIds)),
    goals: new Set(sortedUnique(goals)),
  };
}

function stableOverlap(operation: ScenarioOperation, specialized: ScenarioSpecializedIntent): string | null {
  const owned = ownedIds(specialized);
  switch (operation.type) {
    case "debt":
    case "cash_funded_debt_payoff":
      return owned.debts.has(operation.debtId) ? "debt:" + operation.debtId : null;
    case "expense":
    case "synthetic_expense":
      return owned.expenses.has(operation.expenseId) ? "expense:" + operation.expenseId : null;
    case "goal":
    case "goal_completion":
      return owned.goals.has(operation.goalId) ? "goal:" + operation.goalId : null;
    case "cash_use":
      return operation.relatedGoalId && owned.goals.has(operation.relatedGoalId)
        ? "goal-cash:" + operation.relatedGoalId
        : null;
    default:
      return null;
  }
}

export function detectScenarioCompositionConflicts(
  definition: SpecializedScenarioDefinition,
): ScenarioConflictResult {
  const issues: ScenarioCompositionIssue[] = [];
  if (definition.version !== SPECIALIZED_SCENARIO_DEFINITION_VERSION) {
    issues.push({
      path: "specialized.version",
      code: "invalid_specialized_version",
      message: "Unsupported specialized Scenario Lab definition version.",
    });
  }

  const marker = definition.genericDefinition.specializedIntent ?? null;
  if (definition.specialized === null) {
    if (marker !== null) {
      issues.push({
        path: "specialized.genericDefinition.specializedIntent",
        code: "specialized_intent_mismatch",
        message: "Generic ScenarioDefinition specializedIntent must be null when no specialized adapter is requested.",
      });
    }
  } else {
    if (!definition.specialized.eventId.trim()) {
      issues.push({
        path: "specialized.specialized.eventId",
        code: "invalid_event_id",
        message: "Specialized adapter eventId must be a nonempty stable event ID.",
      });
    }
    if (!marker
      || marker.type !== definition.specialized.type
      || marker.intentId !== definition.specialized.eventId) {
      issues.push({
        path: "specialized.genericDefinition.specializedIntent",
        code: "specialized_intent_mismatch",
        message: "Generic ScenarioDefinition specializedIntent must exactly match the specialized adapter type and eventId.",
      });
    }
  }

  const operations = [
    ...definition.genericDefinition.recurringOverrides,
    ...definition.genericDefinition.oneTimeEvents,
  ].sort((a, b) => operationKey(a).localeCompare(operationKey(b)));
  const operationIds = new Set(operations.map((operation) => operation.id));
  const links = [...definition.operationEventLinks].sort((a, b) =>
    a.operationId.localeCompare(b.operationId) || a.eventId.localeCompare(b.eventId));
  const linkByOperation = new Map<string, string>();

  for (const link of links) {
    if (!link.operationId.trim() || !link.eventId.trim()) {
      issues.push({
        path: "specialized.operationEventLinks." + link.operationId,
        code: "invalid_event_id",
        message: "Operation event links require nonempty operationId and eventId values.",
      });
      continue;
    }
    if (!operationIds.has(link.operationId)) {
      issues.push({
        path: "specialized.operationEventLinks." + link.operationId,
        code: "unknown_operation_link",
        message: "Operation event link references an operation ID that is not present in the generic scenario.",
      });
      continue;
    }
    if (linkByOperation.has(link.operationId)) {
      issues.push({
        path: "specialized.operationEventLinks." + link.operationId,
        code: "duplicate_event_link",
        message: "Each generic scenario operation may have only one explicit event ownership link.",
      });
      continue;
    }
    linkByOperation.set(link.operationId, link.eventId);
  }

  if (definition.specialized) {
    for (const operation of operations) {
      const linkedEventId = linkByOperation.get(operation.id) ?? null;
      const overlap = stableOverlap(operation, definition.specialized);
      if (overlap) {
        issues.push({
          path: "specialized.genericOperation." + operation.id,
          code: "stable_entity_overlap",
          message: "Generic operation " + operation.id + " overlaps adapter-owned stable financial identity " + overlap + ".",
        });
      }
      if (linkedEventId === definition.specialized.eventId) {
        issues.push({
          path: "specialized.genericOperation." + operation.id,
          code: "duplicate_event_representation",
          message: "Generic operation " + operation.id + " explicitly represents the same event as the specialized " + definition.specialized.type + " adapter.",
        });
      } else if (linkedEventId === null && isAmbiguousWithoutEventLink(definition.specialized.type, operation)) {
        issues.push({
          path: "specialized.genericOperation." + operation.id,
          code: "ambiguous_event_ownership",
          message: "Generic " + operation.type + " operation requires an explicit independent eventId while a " + definition.specialized.type + " adapter is active.",
        });
      }
    }
  }

  const overrideCounts = new Map<string, number>();
  for (const override of definition.yourPlanOverrides) {
    overrideCounts.set(override.allocationId, (overrideCounts.get(override.allocationId) ?? 0) + 1);
  }
  for (const [allocationId, count] of [...overrideCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count > 1) {
      issues.push({
        path: "specialized.yourPlanOverrides." + allocationId,
        code: "duplicate_plan_override",
        message: "Your Plan allocation IDs must be unique; duplicate overrides fail closed.",
      });
    }
  }

  issues.sort(issueSort);
  return { valid: issues.length === 0, issues };
}
