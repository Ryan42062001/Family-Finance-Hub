export type HsaEligibilityStatus = "eligible" | "ineligible" | "unknown";
export type HsaCoverageStatus = "self_only" | "family" | "none" | "unknown";
export type HsaEvidenceStatus = "confirmed" | "planning_assumption" | "unknown";
export type HsaLastMonthRuleStatus = "not_elected" | "elected" | "unknown";
export type HsaTestingPeriodStatus = "not_applicable" | "pending" | "satisfied" | "failed" | "unknown";

export type HsaTaxYearProfile = {
  id: string;
  personId: string;
  taxYear: number;
  medicareEffectiveOn: string | null;
  lastMonthRuleStatus: HsaLastMonthRuleStatus | null;
  testingPeriodStatus: HsaTestingPeriodStatus | null;
  confirmedAt: string | null;
  dataVersion: number;
};

export type HsaMonthStatus = {
  id: string;
  personId: string;
  taxYear: number;
  month: number;
  eligibilityStatus: HsaEligibilityStatus;
  coverageStatus: HsaCoverageStatus;
  evidenceStatus: HsaEvidenceStatus;
};

export type HsaMarriedAllocation = {
  id: string;
  taxYear: number;
  personOneId: string;
  personTwoId: string;
  personOneOrdinaryAmount: number;
  personTwoOrdinaryAmount: number;
  confirmedAt: string | null;
};

export type HsaSnapshotContract = {
  profiles: HsaTaxYearProfile[];
  months: HsaMonthStatus[];
  marriedAllocations: HsaMarriedAllocation[];
};

export type RawHsaSnapshotContract = {
  profiles?: Record<string, unknown>[] | null;
  months?: Record<string, unknown>[] | null;
  marriedAllocations?: Record<string, unknown>[] | null;
};

export type HsaContractValidationIssue = {
  path: string;
  code: "duplicate_id" | "invalid_reference" | "invalid_date" | "invalid_enum" | "invalid_number" | "missing_required_number" | "missing_id";
  message: string;
};

const ELIGIBILITY: readonly HsaEligibilityStatus[] = ["eligible", "ineligible", "unknown"];
const COVERAGE: readonly HsaCoverageStatus[] = ["self_only", "family", "none", "unknown"];
const EVIDENCE: readonly HsaEvidenceStatus[] = ["confirmed", "planning_assumption", "unknown"];
const LAST_MONTH_RULE: readonly HsaLastMonthRuleStatus[] = ["not_elected", "elected", "unknown"];
const TESTING_PERIOD: readonly HsaTestingPeriodStatus[] = ["not_applicable", "pending", "satisfied", "failed", "unknown"];

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredInteger(
  value: unknown,
  path: string,
  issues: HsaContractValidationIssue[],
  min: number,
  max: number,
): number {
  const missing = value === null || value === undefined || value === "";
  if (missing) {
    issues.push({ path, code: "missing_required_number", message: `${path} is required.` });
    return min;
  }
  const parsed = parseNumber(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    issues.push({ path, code: "invalid_number", message: `${path} must be an integer between ${min} and ${max}.` });
    return min;
  }
  return parsed;
}

function requiredMoney(value: unknown, path: string, issues: HsaContractValidationIssue[]): number {
  const missing = value === null || value === undefined || value === "";
  if (missing) {
    issues.push({ path, code: "missing_required_number", message: `${path} is required.` });
    return 0;
  }
  const parsed = parseNumber(value);
  if (parsed === null || parsed < 0) {
    issues.push({ path, code: "invalid_number", message: `${path} must be a finite nonnegative number.` });
    return 0;
  }
  return parsed;
}

function requiredString(value: unknown, path: string, issues: HsaContractValidationIssue[]): string {
  if (typeof value === "string" && value.length > 0) return value;
  issues.push({ path, code: "missing_id", message: `${path} requires a nonempty stable ID.` });
  return "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  issues: HsaContractValidationIssue[],
  fallback: T,
  nullable = false,
): T | null {
  if (value === null || value === undefined || value === "") return nullable ? null : fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    issues.push({ path, code: "invalid_enum", message: `${path} contains an unsupported value.` });
    return nullable ? null : fallback;
  }
  return value as T;
}

function isoDate(value: unknown, path: string, issues: HsaContractValidationIssue[]): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    issues.push({ path, code: "invalid_date", message: `${path} must be a real YYYY-MM-DD calendar date.` });
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    issues.push({ path, code: "invalid_date", message: `${path} must be a real YYYY-MM-DD calendar date.` });
    return null;
  }
  return value;
}

function stableIds(rows: Record<string, unknown>[], name: string, issues: HsaContractValidationIssue[]): void {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) issues.push({ path: `${name}[${index}].id`, code: "missing_id", message: `${name} entries require a nonempty stable ID.` });
    else if (seen.has(id)) issues.push({ path: `${name}[${index}].id`, code: "duplicate_id", message: `Duplicate ${name} ID '${id}' is not allowed.` });
    else seen.add(id);
  });
}

function reference(value: unknown, peopleIds: Set<string>, path: string, issues: HsaContractValidationIssue[]): string {
  const id = requiredString(value, path, issues);
  if (id && !peopleIds.has(id)) issues.push({ path, code: "invalid_reference", message: `${path} does not reference a person in this snapshot.` });
  return id;
}

export function buildHsaSnapshotContract(
  raw: RawHsaSnapshotContract,
  peopleIds: Set<string>,
): { contract: HsaSnapshotContract; issues: HsaContractValidationIssue[] } {
  const issues: HsaContractValidationIssue[] = [];
  const profileRows = raw.profiles ?? [];
  const monthRows = raw.months ?? [];
  const allocationRows = raw.marriedAllocations ?? [];

  stableIds(profileRows, "hsaTaxYearProfiles", issues);
  stableIds(monthRows, "hsaMonthStatuses", issues);
  stableIds(allocationRows, "hsaMarriedAllocations", issues);

  const profileKeys = new Set<string>();
  const profiles = profileRows.map((row, index) => {
    const personId = reference(row.person_id, peopleIds, `hsaTaxYearProfiles[${index}].person_id`, issues);
    const taxYear = requiredInteger(row.tax_year, `hsaTaxYearProfiles[${index}].tax_year`, issues, 2004, 9999);
    const key = `${personId}:${taxYear}`;
    if (profileKeys.has(key)) issues.push({ path: `hsaTaxYearProfiles[${index}]`, code: "duplicate_id", message: "Only one HSA tax-year profile is allowed per person and tax year." });
    profileKeys.add(key);
    return {
      id: requiredString(row.id, `hsaTaxYearProfiles[${index}].id`, issues),
      personId,
      taxYear,
      medicareEffectiveOn: isoDate(row.medicare_effective_on, `hsaTaxYearProfiles[${index}].medicare_effective_on`, issues),
      lastMonthRuleStatus: enumValue(row.last_month_rule_status, LAST_MONTH_RULE, `hsaTaxYearProfiles[${index}].last_month_rule_status`, issues, "unknown", true),
      testingPeriodStatus: enumValue(row.testing_period_status, TESTING_PERIOD, `hsaTaxYearProfiles[${index}].testing_period_status`, issues, "unknown", true),
      confirmedAt: nullableString(row.confirmed_at),
      dataVersion: requiredInteger(row.data_version, `hsaTaxYearProfiles[${index}].data_version`, issues, 1, 32767),
    } satisfies HsaTaxYearProfile;
  }).sort((a, b) => `${a.personId}:${a.taxYear}:${a.id}`.localeCompare(`${b.personId}:${b.taxYear}:${b.id}`));

  const monthKeys = new Set<string>();
  const months = monthRows.map((row, index) => {
    const personId = reference(row.person_id, peopleIds, `hsaMonthStatuses[${index}].person_id`, issues);
    const taxYear = requiredInteger(row.tax_year, `hsaMonthStatuses[${index}].tax_year`, issues, 2004, 9999);
    const month = requiredInteger(row.month, `hsaMonthStatuses[${index}].month`, issues, 1, 12);
    const profileKey = `${personId}:${taxYear}`;
    if (!profileKeys.has(profileKey)) issues.push({ path: `hsaMonthStatuses[${index}]`, code: "invalid_reference", message: "Every HSA month row must reference an HSA person/tax-year profile in the same snapshot." });
    const key = `${profileKey}:${month}`;
    if (monthKeys.has(key)) issues.push({ path: `hsaMonthStatuses[${index}]`, code: "duplicate_id", message: "Only one HSA month status is allowed per person, tax year, and month." });
    monthKeys.add(key);
    return {
      id: requiredString(row.id, `hsaMonthStatuses[${index}].id`, issues),
      personId,
      taxYear,
      month,
      eligibilityStatus: enumValue(row.eligibility_status, ELIGIBILITY, `hsaMonthStatuses[${index}].eligibility_status`, issues, "unknown") as HsaEligibilityStatus,
      coverageStatus: enumValue(row.coverage_status, COVERAGE, `hsaMonthStatuses[${index}].coverage_status`, issues, "unknown") as HsaCoverageStatus,
      evidenceStatus: enumValue(row.evidence_status, EVIDENCE, `hsaMonthStatuses[${index}].evidence_status`, issues, "unknown") as HsaEvidenceStatus,
    } satisfies HsaMonthStatus;
  }).sort((a, b) => `${a.personId}:${a.taxYear}:${String(a.month).padStart(2, "0")}:${a.id}`.localeCompare(`${b.personId}:${b.taxYear}:${String(b.month).padStart(2, "0")}:${b.id}`));

  const allocationYears = new Set<number>();
  const marriedAllocations = allocationRows.map((row, index) => {
    const taxYear = requiredInteger(row.tax_year, `hsaMarriedAllocations[${index}].tax_year`, issues, 2004, 9999);
    if (allocationYears.has(taxYear)) issues.push({ path: `hsaMarriedAllocations[${index}]`, code: "duplicate_id", message: "Only one explicit alternate married HSA allocation is allowed per household and tax year." });
    allocationYears.add(taxYear);
    const personOneId = reference(row.person_one_id, peopleIds, `hsaMarriedAllocations[${index}].person_one_id`, issues);
    const personTwoId = reference(row.person_two_id, peopleIds, `hsaMarriedAllocations[${index}].person_two_id`, issues);
    if (personOneId && personOneId === personTwoId) issues.push({ path: `hsaMarriedAllocations[${index}]`, code: "invalid_reference", message: "An alternate married HSA allocation requires two different people." });
    return {
      id: requiredString(row.id, `hsaMarriedAllocations[${index}].id`, issues),
      taxYear,
      personOneId,
      personTwoId,
      personOneOrdinaryAmount: requiredMoney(row.person_one_ordinary_amount, `hsaMarriedAllocations[${index}].person_one_ordinary_amount`, issues),
      personTwoOrdinaryAmount: requiredMoney(row.person_two_ordinary_amount, `hsaMarriedAllocations[${index}].person_two_ordinary_amount`, issues),
      confirmedAt: nullableString(row.confirmed_at),
    } satisfies HsaMarriedAllocation;
  }).sort((a, b) => `${a.taxYear}:${a.personOneId}:${a.personTwoId}:${a.id}`.localeCompare(`${b.taxYear}:${b.personOneId}:${b.personTwoId}:${b.id}`));

  return { contract: { profiles, months, marriedAllocations }, issues };
}
