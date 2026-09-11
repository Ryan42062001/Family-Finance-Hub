import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

export function withNormalizedHsaFacts(
  input: MoneyPriorityRawSnapshot,
  taxYear = 2026,
): MoneyPriorityRawSnapshot {
  const raw = structuredClone(input);
  const hsaAccounts = (raw.retirementAccounts ?? []).filter((account) => account.account_type === "hsa");
  if (!hsaAccounts.length) return raw;

  for (const account of hsaAccounts) account.hsa_ytd_tax_year = taxYear;
  const accountByOwner = new Map<string, Record<string, unknown>>();
  for (const account of hsaAccounts) {
    if (typeof account.owner_person_id === "string" && !accountByOwner.has(account.owner_person_id)) {
      accountByOwner.set(account.owner_person_id, account);
    }
  }
  raw.hsaTaxYearProfiles = [...accountByOwner.keys()].map((personId) => ({
    id: `test-hsa-profile-${personId}`,
    person_id: personId,
    tax_year: taxYear,
    medicare_effective_on: null,
    last_month_rule_status: "not_elected",
    testing_period_status: "not_applicable",
    data_version: 1,
  }));
  raw.hsaMonthStatuses = [...accountByOwner.entries()].flatMap(([personId, account]) =>
    Array.from({ length: 12 }, (_, index) => ({
      id: `test-hsa-month-${personId}-${index + 1}`,
      person_id: personId,
      tax_year: taxYear,
      month: index + 1,
      eligibility_status: account.hsa_eligible === true ? "eligible" : account.hsa_eligible === false ? "ineligible" : "unknown",
      coverage_status: account.hsa_coverage_type === "family" || account.hsa_coverage_type === "self_only"
        ? account.hsa_coverage_type
        : "unknown",
      evidence_status: "confirmed",
    })),
  );
  raw.hsaMarriedAllocations ??= [];
  return raw;
}
