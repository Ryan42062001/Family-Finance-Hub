import { createHash } from "node:crypto";

import type { MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import {
  SCENARIO_FINGERPRINT_SCHEMA_VERSION,
  type ScenarioBaselineDescriptor,
  type ScenarioPolicyBasis,
} from "./scenario-app-contract.ts";

type JsonScalar = string | number | boolean | null;
type Canonical = JsonScalar | Canonical[] | { [key: string]: Canonical };

const EXCLUDED_KEYS = new Set([
  "name", "displayName", "note", "notes", "title", "explanation", "whyNow",
  "tradeoffs", "reasons", "rationale", "createdAt", "updatedAt", "created_at", "updated_at",
]);
const MONEY_KEY = /(amount|balance|payment|income|expense|cost|price|spending|contribution|compensation|wage|liability|proceeds|deductible|shortfall|funding|capacity|room|target|cash|assets|portfolio|value|principal|interestPaid)$/i;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function canonicalNumber(value: number, key: string | null): number | string {
  if (!Number.isFinite(value)) return String(value);
  return key && MONEY_KEY.test(key) ? roundMoney(value) : value;
}

export function canonicalScenarioBasis(value: unknown, key: string | null = null): Canonical {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return canonicalNumber(value, key);
  if (Array.isArray(value)) {
    const hasStableIds = value.every((item) => item && typeof item === "object" && "id" in item);
    const source = hasStableIds
      ? [...value].sort((a, b) => String((a as { id: unknown }).id).localeCompare(String((b as { id: unknown }).id)))
      : value;
    return source.map((item) => canonicalScenarioBasis(item, key));
  }
  if (typeof value === "object") {
    const result: { [key: string]: Canonical } = {};
    for (const childKey of Object.keys(value as Record<string, unknown>).sort()) {
      if (EXCLUDED_KEYS.has(childKey)) continue;
      const child = (value as Record<string, unknown>)[childKey];
      if (child !== undefined) result[childKey] = canonicalScenarioBasis(child, childKey);
    }
    return result;
  }
  return String(value);
}

export function scenarioPolicyBasis(engine: MoneyPriorityEngineResult): ScenarioPolicyBasis {
  return {
    moneyPriorityPolicyVersion: engine.policyVersion,
    planningAssumptionsVersion: engine.planningAssumptionsVersion,
    taxPolicyVersion: engine.taxPolicyVersion,
    taxYear: engine.taxYear,
    asOfDate: engine.asOfDate,
  };
}

export function sameScenarioPolicyBasis(a: ScenarioPolicyBasis, b: ScenarioPolicyBasis): boolean {
  return a.moneyPriorityPolicyVersion === b.moneyPriorityPolicyVersion
    && a.planningAssumptionsVersion === b.planningAssumptionsVersion
    && a.taxPolicyVersion === b.taxPolicyVersion
    && a.taxYear === b.taxYear
    && a.asOfDate === b.asOfDate;
}

export function scenarioBaselineDescriptor(engine: MoneyPriorityEngineResult): ScenarioBaselineDescriptor {
  const policyBasis = scenarioPolicyBasis(engine);
  const canonical = canonicalScenarioBasis({
    fingerprintSchemaVersion: SCENARIO_FINGERPRINT_SCHEMA_VERSION,
    snapshot: engine.snapshot,
    ...policyBasis,
  });
  const digest = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
  return {
    fingerprint: `${SCENARIO_FINGERPRINT_SCHEMA_VERSION}:${digest}`,
    fingerprintSchemaVersion: SCENARIO_FINGERPRINT_SCHEMA_VERSION,
    policyBasis,
  };
}
