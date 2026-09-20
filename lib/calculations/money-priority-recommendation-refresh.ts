import type { MoneyPriorityEngineResult, MoneyPriorityRecommendation } from "./money-priority-engine.ts";
import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateUserPlan, type MoneyPlanOverride, type OverrideStatus } from "./money-priority-user-plan.ts";

export const RECOMMENDATION_REFRESH_VERSION = "2026.2";

export type RecommendationRefreshState = "current" | "refresh_recommended" | "materially_changed" | "critical_change";
export type ChangeSignificance = "informational" | "material" | "critical";
export type ProfileChangeCategory = "household" | "income" | "expense" | "debt" | "cash" | "goal" | "retirement" | "tax_profile" | "risk" | "policy" | "assumptions" | "time" | "recommendation" | "feasibility";

export type ProfileChange = {
  category: ProfileChangeCategory;
  entityId: string | null;
  field: string;
  significance: ChangeSignificance;
  reason: string;
  previousValue?: string | number | boolean | null;
  currentValue?: string | number | boolean | null;
};

export type RecommendationChange = {
  recommendationId: string;
  changeType: "added" | "removed" | "changed";
  fields: string[];
  significance: ChangeSignificance;
};

export type AllocationChange = {
  allocationId: string;
  previousAmount: number | null;
  currentAmount: number | null;
  delta: number;
  changeType: "added" | "removed" | "increased" | "decreased";
  significance: ChangeSignificance;
};

export type RefreshOverrideStatus = { allocationId: string; status: OverrideStatus; reason: string };
export type RecommendationPolicyBasis = {
  moneyPriorityPolicyVersion: string;
  planningAssumptionsVersion: string;
  taxPolicyVersion: string;
  taxYear: number;
  asOfDate: string;
};

export type RecommendationRefreshAssessment = {
  version: string;
  state: RecommendationRefreshState;
  previousPolicyBasis: RecommendationPolicyBasis;
  currentPolicyBasis: RecommendationPolicyBasis;
  stateTransition: { previousFeasibilityStatus: MoneyPriorityEngineResult["feasibility"]["status"]; currentFeasibilityStatus: MoneyPriorityEngineResult["feasibility"]["status"] };
  financialBasisFingerprint: string;
  previousFinancialBasisFingerprint: string;
  recommendationFingerprint: string;
  previousRecommendationFingerprint: string;
  detectedChanges: ProfileChange[];
  recommendationChanges: RecommendationChange[];
  addedRecommendations: RecommendationChange[];
  removedRecommendations: RecommendationChange[];
  changedRecommendations: RecommendationChange[];
  allocationChanges: AllocationChange[];
  overrideStatuses: RefreshOverrideStatus[];
  reasons: string[];
};

type JsonScalar = string | number | boolean | null;
type Canonical = JsonScalar | Canonical[] | { [key: string]: Canonical };

const EXCLUDED_KEYS = new Set(["name", "displayName", "note", "notes", "title", "explanation", "whyNow", "tradeoffs", "reasons", "rationale", "createdAt", "updatedAt", "created_at", "updated_at"]);
const MONEY_KEY = /(amount|balance|payment|income|expense|cost|price|spending|contribution|compensation|wage|liability|proceeds|deductible|shortfall|funding|capacity|room|target|cash|assets|portfolio|value|principal|interestPaid)$/i;

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function canonicalNumber(value: number, key: string | null): number | string {
  if (!Number.isFinite(value)) return String(value);
  return key && MONEY_KEY.test(key) ? roundMoney(value) : value;
}

function canonical(value: unknown, key: string | null = null): Canonical {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return canonicalNumber(value, key);
  if (Array.isArray(value)) {
    const hasStableIds = value.every((item) => item && typeof item === "object" && "id" in item);
    const source = hasStableIds
      ? [...value].sort((a, b) => String((a as { id: unknown }).id).localeCompare(String((b as { id: unknown }).id)))
      : value;
    return source.map((item) => canonical(item, key));
  }
  if (typeof value === "object") {
    const result: { [key: string]: Canonical } = {};
    for (const childKey of Object.keys(value as Record<string, unknown>).sort()) {
      if (EXCLUDED_KEYS.has(childKey)) continue;
      const child = (value as Record<string, unknown>)[childKey];
      if (child !== undefined) result[childKey] = canonical(child, childKey);
    }
    return result;
  }
  return String(value);
}

function canonicalEqual(a: unknown, b: unknown, key: string | null = null): boolean {
  return JSON.stringify(canonical(a, key)) === JSON.stringify(canonical(b, key));
}

function fingerprint(value: unknown): string {
  // FNV-1a is a deterministic change-detection digest only. It is not authorization, encryption, or a security token.
  const text = JSON.stringify(canonical(value));
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return `rr2-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function policyBasis(engine: MoneyPriorityEngineResult): RecommendationPolicyBasis {
  return {
    moneyPriorityPolicyVersion: engine.policyVersion,
    planningAssumptionsVersion: engine.planningAssumptionsVersion,
    taxPolicyVersion: engine.taxPolicyVersion,
    taxYear: engine.taxYear,
    asOfDate: engine.asOfDate,
  };
}

function financialBasis(engine: MoneyPriorityEngineResult) {
  return { snapshot: engine.snapshot, ...policyBasis(engine) };
}

function stableAllocations(item: MoneyPriorityRecommendation) {
  return item.allocations
    .map((allocation) => ({
      category: allocation.category,
      relatedEntityId: allocation.relatedEntityId,
      monthlyAmount: roundMoney(allocation.monthlyAmount),
      annualAmount: allocation.annualAmount === null ? null : roundMoney(allocation.annualAmount),
    }))
    .sort((a, b) => `${a.category}:${a.relatedEntityId ?? "household"}`.localeCompare(`${b.category}:${b.relatedEntityId ?? "household"}`));
}

function recommendationBasis(engine: MoneyPriorityEngineResult) {
  return {
    recommendations: engine.recommendations.map((item) => ({
      id: item.id,
      rank: item.rank,
      stage: item.stage,
      state: item.state,
      urgency: item.urgency,
      allocations: stableAllocations(item),
    })),
    feasibility: {
      status: engine.feasibility.status,
      planFundingGap: engine.feasibility.status === "funding_gap" ? roundMoney(engine.feasibility.planFundingGap) : 0,
    },
    retirementFloor: {
      status: engine.build.retirementFloor.status,
      reportedScheduledContributionAnnual: engine.build.retirementFloor.reportedScheduledContributionAnnual,
      currentRetirementSavingsAnnual: engine.build.retirementFloor.currentRetirementSavingsAnnual,
      unsupportedScheduledContributionAnnual: engine.build.retirementFloor.unsupportedScheduledContributionAnnual,
      remainingLegalCapacityAfterScheduledAnnual: engine.build.retirementFloor.remainingLegalCapacityAfterScheduledAnnual,
      projectionRequiredCorrectiveRate: engine.build.retirementFloor.projectionRequiredCorrectiveRate,
      protectedAnnualAmount: engine.build.retirementFloor.protectedAnnualAmount,
      protectedFloorShortfallAnnual: engine.build.retirementFloor.protectedFloorShortfallAnnual,
      additionalRetirementOpportunityAnnual: engine.build.retirementFloor.additionalRetirementOpportunityAnnual,
      state: engine.build.retirementFloor.state,
      missingData: engine.build.retirementFloor.missingData,
    },
    goalIntelligence: engine.build.goalIntelligence.map((goal) => ({
      goalId: goal.goalId,
      priorityBand: goal.priorityBand,
      scheduleState: goal.scheduleState,
      requiredMonthlyFunding: goal.requiredMonthlyFunding,
      remainingTargetAmount: goal.remainingTargetAmount,
      remainingCoreNeedAmount: goal.remainingCoreNeedAmount,
      consequenceSeverity: goal.consequenceSeverity,
      debtExposure: goal.debtExposure,
      targetReasonableness: goal.targetReasonableness,
      state: goal.state,
      missingData: goal.missingData,
    })),
  };
}

function scalar(value: unknown, key: string): JsonScalar | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return canonicalNumber(value, key) as number;
  return undefined;
}

function diffEntityCollection(previous: Array<Record<string, unknown>>, current: Array<Record<string, unknown>>, category: ProfileChangeCategory): ProfileChange[] {
  const changes: ProfileChange[] = [];
  const oldMap = new Map(previous.map((item) => [String(item.id), item]));
  const newMap = new Map(current.map((item) => [String(item.id), item]));
  for (const id of [...new Set([...oldMap.keys(), ...newMap.keys()])].sort()) {
    const before = oldMap.get(id); const after = newMap.get(id);
    if (!before || !after) {
      changes.push({ category, entityId: id, field: "entity", significance: "informational", reason: before ? `${category} entity was removed.` : `${category} entity was added.` });
      continue;
    }
    for (const field of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      if (field === "id" || EXCLUDED_KEYS.has(field)) continue;
      if (canonicalEqual(before[field], after[field], field)) continue;
      changes.push({ category, entityId: id, field, significance: "informational", reason: `${category} ${field} changed.`, previousValue: scalar(before[field], field), currentValue: scalar(after[field], field) });
    }
  }
  return changes;
}

function preferenceCategory(field: string): ProfileChangeCategory {
  const normalized = field.toLowerCase();
  if (normalized.includes("tax") || normalized.includes("filing") || normalized.includes("agi") || normalized.includes("magi") || normalized.includes("workplaceplan")) return "tax_profile";
  if (normalized.includes("risk") || normalized.includes("emergency") || normalized.includes("disruption") || normalized.includes("jobreplacement")) return "risk";
  return "household";
}

function detectProfileChanges(previous: MoneyPrioritySnapshot, current: MoneyPrioritySnapshot): ProfileChange[] {
  const changes: ProfileChange[] = [];
  changes.push(...diffEntityCollection(previous.people as unknown as Array<Record<string, unknown>>, current.people as unknown as Array<Record<string, unknown>>, "household"));
  changes.push(...diffEntityCollection(previous.income as unknown as Array<Record<string, unknown>>, current.income as unknown as Array<Record<string, unknown>>, "income"));
  changes.push(...diffEntityCollection(previous.expenses as unknown as Array<Record<string, unknown>>, current.expenses as unknown as Array<Record<string, unknown>>, "expense"));
  changes.push(...diffEntityCollection(previous.accounts as unknown as Array<Record<string, unknown>>, current.accounts as unknown as Array<Record<string, unknown>>, "cash"));
  changes.push(...diffEntityCollection(previous.debts as unknown as Array<Record<string, unknown>>, current.debts as unknown as Array<Record<string, unknown>>, "debt"));
  changes.push(...diffEntityCollection(previous.goals as unknown as Array<Record<string, unknown>>, current.goals as unknown as Array<Record<string, unknown>>, "goal"));
  changes.push(...diffEntityCollection(previous.retirementAccounts as unknown as Array<Record<string, unknown>>, current.retirementAccounts as unknown as Array<Record<string, unknown>>, "retirement"));
  const before = (previous.preferences ?? {}) as unknown as Record<string, unknown>; const after = (current.preferences ?? {}) as unknown as Record<string, unknown>;
  for (const field of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    if (EXCLUDED_KEYS.has(field) || canonicalEqual(before[field], after[field], field)) continue;
    changes.push({ category: preferenceCategory(field), entityId: null, field, significance: "informational", reason: `Planning preference ${field} changed.`, previousValue: scalar(before[field], field), currentValue: scalar(after[field], field) });
  }
  return changes;
}

function recMap(engine: MoneyPriorityEngineResult) { return new Map(engine.recommendations.map((item) => [item.id, item])); }
function allocationKey(rec: MoneyPriorityRecommendation, index: number) { const a = rec.allocations[index]; return `${rec.id}::${a.category}::${a.relatedEntityId ?? "household"}`; }

function compareRecommendations(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult): RecommendationChange[] {
  const changes: RecommendationChange[] = []; const old = recMap(previous); const now = recMap(current);
  for (const id of [...new Set([...old.keys(), ...now.keys()])].sort()) {
    const before = old.get(id); const after = now.get(id);
    if (!before || !after) {
      const item = before ?? after;
      const critical = item?.stage === "secure" && item.state === "recommended" && (item.urgency === "required" || item.urgency === "high");
      changes.push({ recommendationId: id, changeType: before ? "removed" : "added", fields: ["recommendation"], significance: critical ? "critical" : "material" });
      continue;
    }
    const fields: string[] = [];
    if (before.state !== after.state) fields.push("state");
    if (before.urgency !== after.urgency) fields.push("urgency");
    if (before.rank !== after.rank) fields.push("rank");
    if (!canonicalEqual(stableAllocations(before), stableAllocations(after))) fields.push("allocations");
    if (fields.length) {
      const critical = after.stage === "secure" && after.state === "recommended" && (after.urgency === "required" || after.urgency === "high") && (fields.includes("state") || fields.includes("urgency"));
      changes.push({ recommendationId: id, changeType: "changed", fields, significance: critical ? "critical" : "material" });
    }
  }
  return changes;
}

function compareAllocations(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult): AllocationChange[] {
  const old = new Map<string, number>(); const now = new Map<string, number>();
  for (const rec of previous.recommendations) rec.allocations.forEach((a, i) => old.set(allocationKey(rec, i), roundMoney(a.monthlyAmount)));
  for (const rec of current.recommendations) rec.allocations.forEach((a, i) => now.set(allocationKey(rec, i), roundMoney(a.monthlyAmount)));
  const result: AllocationChange[] = [];
  for (const id of [...new Set([...old.keys(), ...now.keys()])].sort()) {
    const a = old.get(id); const b = now.get(id); if (a === b) continue;
    const delta = roundMoney((b ?? 0) - (a ?? 0));
    result.push({ allocationId: id, previousAmount: a ?? null, currentAmount: b ?? null, delta, changeType: a === undefined ? "added" : b === undefined ? "removed" : delta > 0 ? "increased" : "decreased", significance: "material" });
  }
  return result;
}

function addBasisChanges(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult, changes: ProfileChange[]): void {
  if (previous.policyVersion !== current.policyVersion) changes.push({ category: "policy", entityId: null, field: "policyVersion", significance: "informational", reason: "Money-priority policy version changed.", previousValue: previous.policyVersion, currentValue: current.policyVersion });
  if (previous.taxPolicyVersion !== current.taxPolicyVersion) changes.push({ category: "policy", entityId: null, field: "taxPolicyVersion", significance: "informational", reason: "Tax policy version changed.", previousValue: previous.taxPolicyVersion, currentValue: current.taxPolicyVersion });
  if (previous.taxYear !== current.taxYear) changes.push({ category: "policy", entityId: null, field: "taxYear", significance: "informational", reason: "Tax year changed.", previousValue: previous.taxYear, currentValue: current.taxYear });
  if (previous.planningAssumptionsVersion !== current.planningAssumptionsVersion) changes.push({ category: "assumptions", entityId: null, field: "planningAssumptionsVersion", significance: "informational", reason: "Planning assumptions version changed.", previousValue: previous.planningAssumptionsVersion, currentValue: current.planningAssumptionsVersion });
  if (previous.asOfDate !== current.asOfDate) changes.push({ category: "time", entityId: null, field: "asOfDate", significance: "informational", reason: "The explicit planning as-of date changed.", previousValue: previous.asOfDate, currentValue: current.asOfDate });

  const feasibilityFields: Array<keyof MoneyPriorityEngineResult["feasibility"]> = ["status", "monthlyPlanCapacity", "protectedMonthlyFundingNeed", "planFundingGap"];
  for (const field of feasibilityFields) {
    if (canonicalEqual(previous.feasibility[field], current.feasibility[field], field)) continue;
    const critical = field === "status" && current.feasibility.status === "funding_gap";
    const material = field === "status" || (field === "planFundingGap" && (previous.feasibility.status === "funding_gap" || current.feasibility.status === "funding_gap"));
    changes.push({ category: "feasibility", entityId: null, field, significance: critical ? "critical" : material ? "material" : "informational", reason: `Plan feasibility ${field} changed.`, previousValue: scalar(previous.feasibility[field], field), currentValue: scalar(current.feasibility[field], field) });
  }
}

function criticalInputChange(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult, changes: ProfileChange[], recommendationChanges: RecommendationChange[]): boolean {
  const lostAllIncome = previous.snapshot.aggregates.monthlyTakeHomeIncome > 0 && current.snapshot.aggregates.monthlyTakeHomeIncome <= 0;
  const newFundingGap = previous.feasibility.status !== "funding_gap" && current.feasibility.status === "funding_gap";
  const activeDisruption = changes.some((change) => change.category === "risk" && change.field.toLowerCase().includes("disruption") && change.currentValue === true);
  const employerMatchLost = previous.secure.employerMatchMonthlyGap <= 0 && current.secure.employerMatchMonthlyGap > 0;
  const newCriticalSecureAction = recommendationChanges.some((change) => change.changeType === "added" && change.significance === "critical");
  return lostAllIncome || newFundingGap || activeDisruption || employerMatchLost || newCriticalSecureAction;
}

export function assessRecommendationRefresh(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult, previousOverrides: readonly MoneyPlanOverride[] = []): RecommendationRefreshAssessment {
  const previousPolicyBasis = policyBasis(previous); const currentPolicyBasis = policyBasis(current);
  const previousFinancialBasisFingerprint = fingerprint(financialBasis(previous)); const financialBasisFingerprint = fingerprint(financialBasis(current));
  const previousRecommendationFingerprint = fingerprint(recommendationBasis(previous)); const recommendationFingerprint = fingerprint(recommendationBasis(current));
  const detectedChanges = detectProfileChanges(previous.snapshot, current.snapshot);
  addBasisChanges(previous, current, detectedChanges);
  const recommendationChanges = compareRecommendations(previous, current); const allocationChanges = compareAllocations(previous, current);
  const reconciled = evaluateUserPlan(current, previousOverrides).overrides;
  const overrideStatuses = [...reconciled.active, ...reconciled.superseded, ...reconciled.invalid].map((item) => ({ allocationId: item.allocationId, status: item.status, reason: item.reason }));
  const basisChanged = financialBasisFingerprint !== previousFinancialBasisFingerprint;
  const recommendationsChanged = recommendationFingerprint !== previousRecommendationFingerprint || recommendationChanges.length > 0 || allocationChanges.length > 0;
  const critical = criticalInputChange(previous, current, detectedChanges, recommendationChanges);
  const state: RecommendationRefreshState = critical ? "critical_change" : recommendationsChanged ? "materially_changed" : basisChanged ? "refresh_recommended" : "current";
  const reasons = state === "current"
    ? ["The financially relevant planning basis and authoritative recommendation are current."]
    : state === "refresh_recommended"
      ? ["The financially relevant planning basis changed, but the authoritative recommendation remains substantially equivalent."]
      : state === "materially_changed"
        ? ["The current authoritative engine result materially changes recommendation order, state, allocation, destination, or feasibility."]
        : ["A high-impact household or Secure-stage transition means the previous recommendation may now be unsafe or inappropriate."];
  return {
    version: RECOMMENDATION_REFRESH_VERSION,
    state,
    previousPolicyBasis,
    currentPolicyBasis,
    stateTransition: { previousFeasibilityStatus: previous.feasibility.status, currentFeasibilityStatus: current.feasibility.status },
    financialBasisFingerprint,
    previousFinancialBasisFingerprint,
    recommendationFingerprint,
    previousRecommendationFingerprint,
    detectedChanges,
    recommendationChanges,
    addedRecommendations: recommendationChanges.filter((item) => item.changeType === "added"),
    removedRecommendations: recommendationChanges.filter((item) => item.changeType === "removed"),
    changedRecommendations: recommendationChanges.filter((item) => item.changeType === "changed"),
    allocationChanges,
    overrideStatuses,
    reasons,
  };
}
