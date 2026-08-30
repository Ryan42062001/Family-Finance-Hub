import type { MoneyPriorityEngineResult, MoneyPriorityRecommendation } from "./money-priority-engine.ts";
import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateUserPlan, type MoneyPlanOverride, type OverrideStatus } from "./money-priority-user-plan.ts";

export const RECOMMENDATION_REFRESH_VERSION = "2026.1";

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

export type RecommendationRefreshAssessment = {
  version: string;
  state: RecommendationRefreshState;
  financialBasisFingerprint: string;
  previousFinancialBasisFingerprint: string;
  recommendationFingerprint: string;
  previousRecommendationFingerprint: string;
  detectedChanges: ProfileChange[];
  recommendationChanges: RecommendationChange[];
  allocationChanges: AllocationChange[];
  overrideStatuses: RefreshOverrideStatus[];
  reasons: string[];
};

type JsonScalar = string | number | boolean | null;
type Canonical = JsonScalar | Canonical[] | { [key: string]: Canonical };

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

function canonical(value: unknown): Canonical {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? roundMoney(value) : String(value);
  if (Array.isArray(value)) {
    const values = value.map(canonical);
    if (value.every((item) => item && typeof item === "object" && "id" in item)) {
      return values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return values;
  }
  if (typeof value === "object") {
    const result: { [key: string]: Canonical } = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (["name", "displayName", "note", "notes", "title", "explanation", "whyNow", "tradeoffs", "reasons"].includes(key)) continue;
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) result[key] = canonical(child);
    }
    return result;
  }
  return String(value);
}

function fingerprint(value: unknown): string {
  // FNV-1a is a deterministic change-detection digest, not a security primitive or authorization token.
  const text = JSON.stringify(canonical(value));
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return `rr1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function basis(engine: MoneyPriorityEngineResult) {
  return { snapshot: engine.snapshot, policyVersion: engine.policyVersion, planningAssumptionsVersion: engine.planningAssumptionsVersion, taxPolicyVersion: engine.taxPolicyVersion, taxYear: engine.taxYear, asOfDate: engine.asOfDate };
}

function recommendationBasis(engine: MoneyPriorityEngineResult) {
  return {
    recommendations: engine.recommendations.map((item) => ({ id: item.id, rank: item.rank, stage: item.stage, state: item.state, urgency: item.urgency, allocations: item.allocations.map((a) => ({ category: a.category, relatedEntityId: a.relatedEntityId, monthlyAmount: roundMoney(a.monthlyAmount), annualAmount: a.annualAmount === null ? null : roundMoney(a.annualAmount) })) })),
    feasibility: engine.feasibility,
  };
}

function scalar(value: unknown): JsonScalar | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return roundMoney(value);
  return undefined;
}

function diffEntityCollection(previous: Array<Record<string, unknown>>, current: Array<Record<string, unknown>>, category: ProfileChangeCategory, ignored = new Set(["name", "displayName"])): ProfileChange[] {
  const changes: ProfileChange[] = [];
  const oldMap = new Map(previous.map((item) => [String(item.id), item]));
  const newMap = new Map(current.map((item) => [String(item.id), item]));
  for (const id of [...new Set([...oldMap.keys(), ...newMap.keys()])].sort()) {
    const before = oldMap.get(id); const after = newMap.get(id);
    if (!before || !after) {
      changes.push({ category, entityId: id, field: "entity", significance: category === "debt" || category === "income" ? "material" : "informational", reason: before ? `${category} entity was removed.` : `${category} entity was added.` });
      continue;
    }
    for (const field of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      if (field === "id" || ignored.has(field)) continue;
      if (JSON.stringify(canonical(before[field])) === JSON.stringify(canonical(after[field]))) continue;
      changes.push({ category, entityId: id, field, significance: "informational", reason: `${category} ${field} changed.`, previousValue: scalar(before[field]), currentValue: scalar(after[field]) });
    }
  }
  return changes;
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
  const prefBefore = previous.preferences as unknown as Record<string, unknown>; const prefAfter = current.preferences as unknown as Record<string, unknown>;
  for (const field of [...new Set([...Object.keys(prefBefore), ...Object.keys(prefAfter)])].sort()) {
    if (JSON.stringify(canonical(prefBefore[field])) === JSON.stringify(canonical(prefAfter[field]))) continue;
    const normalizedField = field.toLowerCase();
    const category: ProfileChangeCategory = normalizedField.includes("tax") || normalizedField.includes("filing") || normalizedField.includes("agi") || normalizedField.includes("magi")
      ? "tax_profile"
      : normalizedField.includes("risk") || normalizedField.includes("emergency") || normalizedField.includes("disruption") || normalizedField.includes("jobreplacement")
        ? "risk"
        : "household";
    changes.push({ category, entityId: null, field, significance: "informational", reason: `Planning preference ${field} changed.`, previousValue: scalar(prefBefore[field]), currentValue: scalar(prefAfter[field]) });
  }
  return changes;
}

function recMap(engine: MoneyPriorityEngineResult) { return new Map(engine.recommendations.map((item) => [item.id, item])); }
function allocationKey(rec: MoneyPriorityRecommendation, index: number) { const a = rec.allocations[index]; return `${rec.id}::${a.category}::${a.relatedEntityId ?? "household"}`; }

function compareRecommendations(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult): RecommendationChange[] {
  const changes: RecommendationChange[] = []; const old = recMap(previous); const now = recMap(current);
  for (const id of [...new Set([...old.keys(), ...now.keys()])].sort()) {
    const before = old.get(id); const after = now.get(id);
    if (!before || !after) { changes.push({ recommendationId: id, changeType: before ? "removed" : "added", fields: ["recommendation"], significance: (before ?? after)?.urgency === "required" ? "critical" : "material" }); continue; }
    const fields: string[] = [];
    if (before.state !== after.state) fields.push("state"); if (before.urgency !== after.urgency) fields.push("urgency"); if (before.rank !== after.rank) fields.push("rank");
    if (JSON.stringify(canonical(before.allocations)) !== JSON.stringify(canonical(after.allocations))) fields.push("allocations");
    if (fields.length) changes.push({ recommendationId: id, changeType: "changed", fields, significance: after.urgency === "required" && (fields.includes("state") || fields.includes("urgency")) ? "critical" : "material" });
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

function criticalInputChange(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult, changes: ProfileChange[]): boolean {
  const oldIncome = previous.snapshot.aggregates.monthlyTakeHomeIncome; const newIncome = current.snapshot.aggregates.monthlyTakeHomeIncome;
  const lostIncome = oldIncome > 0 && newIncome <= 0;
  const newFundingGap = previous.feasibility.status !== "funding_gap" && current.feasibility.status === "funding_gap";
  const newRequired = current.recommendations.some((r) => r.urgency === "required" && !previous.recommendations.some((p) => p.id === r.id && p.urgency === "required"));
  const activeDisruption = changes.some((c) => c.category === "risk" && c.field.toLowerCase().includes("disruption") && c.currentValue === true);
  return lostIncome || newFundingGap || newRequired || activeDisruption;
}

export function assessRecommendationRefresh(previous: MoneyPriorityEngineResult, current: MoneyPriorityEngineResult, previousOverrides: readonly MoneyPlanOverride[] = []): RecommendationRefreshAssessment {
  const previousFinancialBasisFingerprint = fingerprint(basis(previous)); const financialBasisFingerprint = fingerprint(basis(current));
  const previousRecommendationFingerprint = fingerprint(recommendationBasis(previous)); const recommendationFingerprint = fingerprint(recommendationBasis(current));
  const detectedChanges = detectProfileChanges(previous.snapshot, current.snapshot);
  if (previous.policyVersion !== current.policyVersion) detectedChanges.push({ category: "policy", entityId: null, field: "policyVersion", significance: "informational", reason: "Money-priority policy version changed.", previousValue: previous.policyVersion, currentValue: current.policyVersion });
  if (previous.taxPolicyVersion !== current.taxPolicyVersion || previous.taxYear !== current.taxYear) detectedChanges.push({ category: "policy", entityId: null, field: "taxPolicyBasis", significance: "informational", reason: "Tax policy basis changed.", previousValue: `${previous.taxPolicyVersion}:${previous.taxYear}`, currentValue: `${current.taxPolicyVersion}:${current.taxYear}` });
  if (previous.planningAssumptionsVersion !== current.planningAssumptionsVersion) detectedChanges.push({ category: "assumptions", entityId: null, field: "planningAssumptionsVersion", significance: "informational", reason: "Planning assumptions version changed.", previousValue: previous.planningAssumptionsVersion, currentValue: current.planningAssumptionsVersion });
  if (previous.asOfDate !== current.asOfDate) detectedChanges.push({ category: "time", entityId: null, field: "asOfDate", significance: "informational", reason: "The explicit planning as-of date changed.", previousValue: previous.asOfDate, currentValue: current.asOfDate });
  const recommendationChanges = compareRecommendations(previous, current); const allocationChanges = compareAllocations(previous, current);
  if (previous.feasibility.status !== current.feasibility.status) detectedChanges.push({ category: "feasibility", entityId: null, field: "status", significance: current.feasibility.status === "funding_gap" ? "critical" : "material", reason: "Plan feasibility status changed.", previousValue: previous.feasibility.status, currentValue: current.feasibility.status });
  const reconciled = evaluateUserPlan(current, previousOverrides).overrides;
  const overrideStatuses = [...reconciled.active, ...reconciled.superseded, ...reconciled.invalid].map((o) => ({ allocationId: o.allocationId, status: o.status, reason: o.reason }));
  const basisChanged = financialBasisFingerprint !== previousFinancialBasisFingerprint;
  const recommendationsChanged = recommendationFingerprint !== previousRecommendationFingerprint || recommendationChanges.length > 0 || allocationChanges.length > 0;
  const critical = criticalInputChange(previous, current, detectedChanges) || recommendationChanges.some((c) => c.significance === "critical");
  const state: RecommendationRefreshState = critical ? "critical_change" : recommendationsChanged ? "materially_changed" : basisChanged ? "refresh_recommended" : "current";
  const reasons = state === "current" ? ["The financially relevant planning basis and authoritative recommendation are current."] : state === "refresh_recommended" ? ["The planning basis changed, but the authoritative recommendation remains substantially equivalent."] : state === "materially_changed" ? ["The current authoritative engine result materially changes the recommended plan."] : ["A high-impact change means the previous recommendation may no longer be appropriate."];
  return { version: RECOMMENDATION_REFRESH_VERSION, state, financialBasisFingerprint, previousFinancialBasisFingerprint, recommendationFingerprint, previousRecommendationFingerprint, detectedChanges, recommendationChanges, allocationChanges, overrideStatuses, reasons };
}
