import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import type { MoneyPriorityTaxPolicy } from "./money-priority-tax-policy.ts";

export type HsaLegalCapacityState = "available" | "limit_reached" | "not_eligible" | "more_information_needed";
export type HsaLegalCapacityBasis = "period_aware" | "conditional_last_month_rule";

export type HsaAccountLegalCapacity = {
  accountId: string;
  ownerPersonId: string | null;
  state: HsaLegalCapacityState;
  annualLimit: number | null;
  contributedYtd: number | null;
  remainingAnnualRoom: number | null;
  catchUpEligible: boolean;
  catchUpAmount: number;
  sharedCapacityGroup: string | null;
  sharedCapacityRemainingRoom: number | null;
  capacityBasis: HsaLegalCapacityBasis | null;
  reasons: string[];
  missingData: string[];
};

export type HsaLegalCapacityResult = {
  byAccountId: Map<string, HsaAccountLegalCapacity>;
  warnings: string[];
};

type MonthFact = {
  eligibility: "eligible" | "ineligible" | "unknown";
  coverage: "self_only" | "family" | "none" | "unknown";
  planningAssumption: boolean;
};

type PersonFacts = {
  personId: string;
  months: MonthFact[];
  missingData: Set<string>;
  reasons: Set<string>;
  warnings: Set<string>;
  basis: HsaLegalCapacityBasis;
  age: number | null;
  independentOrdinary: number;
  sharedOrdinaryAllocation: number;
  catchUpCapacity: number;
  annualCeiling: number | null;
  ytd: number | null;
  remaining: number | null;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageAtYearEnd(snapshot: MoneyPrioritySnapshot, personId: string, taxYear: number): number | null {
  const person = snapshot.people.find((item) => item.id === personId);
  if (!person?.birthDate) return null;
  const birth = parseIsoDate(person.birthDate);
  return birth ? taxYear - birth.getUTCFullYear() : null;
}

function medicareStartMonth(value: string | null, taxYear: number): number | null {
  if (!value) return null;
  const date = parseIsoDate(value);
  if (!date) return null;
  const year = date.getUTCFullYear();
  if (year < taxYear) return 1;
  if (year > taxYear) return null;
  return date.getUTCMonth() + 1;
}

function personMonthFacts(snapshot: MoneyPrioritySnapshot, personId: string, taxYear: number): PersonFacts {
  const profile = snapshot.hsa.profiles.find((item) => item.personId === personId && item.taxYear === taxYear);
  const rows = snapshot.hsa.months.filter((item) => item.personId === personId && item.taxYear === taxYear);
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const missingData = new Set<string>();
  const reasons = new Set<string>();
  const warnings = new Set<string>();
  const medicareMonth = medicareStartMonth(profile?.medicareEffectiveOn ?? null, taxYear);
  if (!profile) missingData.add(`HSA person/tax-year profile is required for ${personId} in ${taxYear}.`);

  const months: MonthFact[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const row = byMonth.get(month);
    if (!row) {
      months.push({ eligibility: "unknown", coverage: "unknown", planningAssumption: false });
      missingData.add(`HSA month ${month} eligibility/coverage is required for ${personId} in ${taxYear}.`);
      continue;
    }
    let eligibility = row.evidenceStatus === "unknown" ? "unknown" : row.eligibilityStatus;
    let coverage = row.evidenceStatus === "unknown" ? "unknown" : row.coverageStatus;
    if (row.evidenceStatus === "unknown") {
      missingData.add(`HSA month ${month} evidence is unknown for ${personId} in ${taxYear}.`);
    }
    if (medicareMonth !== null && month >= medicareMonth) {
      if (eligibility === "eligible") reasons.add(`Medicare effective timing overrides recorded HSA eligibility beginning month ${medicareMonth}.`);
      eligibility = "ineligible";
      coverage = "none";
    }
    months.push({ eligibility, coverage, planningAssumption: row.evidenceStatus === "planning_assumption" });
  }

  let basis: HsaLegalCapacityBasis = "period_aware";
  if (profile?.lastMonthRuleStatus === "elected") {
    const december = months[11]!;
    if (profile.testingPeriodStatus === "failed") {
      warnings.add(`hsa_last_month_rule_testing_period_failed:${personId}:${taxYear}`);
      reasons.add("The last-month-rule testing period is marked failed, so ordinary month-based capacity is used instead of conditional full-year treatment.");
    } else if (december.eligibility === "eligible" && (december.coverage === "self_only" || december.coverage === "family")) {
      basis = "conditional_last_month_rule";
      for (let index = 0; index < 12; index += 1) {
        months[index] = {
          eligibility: "eligible",
          coverage: december.coverage,
          planningAssumption: months[index]!.planningAssumption || december.planningAssumption,
        };
      }
      warnings.add(`hsa_conditional_last_month_rule_testing_period:${personId}:${taxYear}`);
      reasons.add("Capacity conditionally relies on the explicitly elected HSA last-month rule and remains subject to the testing period.");
    } else if (december.eligibility === "unknown" || december.coverage === "unknown") {
      missingData.add(`December eligibility and coverage are required to apply the elected HSA last-month rule for ${personId} in ${taxYear}.`);
    } else {
      warnings.add(`hsa_last_month_rule_not_available:${personId}:${taxYear}`);
      reasons.add("The elected last-month rule is not applied because December eligibility/coverage does not establish statutory eligibility; ordinary month-based capacity is used.");
    }
  }

  if (months.some((month) => month.planningAssumption)) {
    reasons.add("HSA capacity includes explicit planning-assumption month facts and must be recomputed if those facts change.");
  }

  const age = ageAtYearEnd(snapshot, personId, taxYear);
  if (age === null) missingData.add(`Birth date is required to determine age-55 HSA catch-up capacity for ${personId}.`);

  return {
    personId,
    months,
    missingData,
    reasons,
    warnings,
    basis,
    age,
    independentOrdinary: 0,
    sharedOrdinaryAllocation: 0,
    catchUpCapacity: 0,
    annualCeiling: null,
    ytd: null,
    remaining: null,
  };
}

function aggregateOwnerYtd(snapshot: MoneyPrioritySnapshot, ownerPersonId: string, taxYear: number): { value: number | null; missing: string[] } {
  const accounts = snapshot.retirementAccounts.filter((account) => account.type === "hsa" && account.ownerPersonId === ownerPersonId);
  if (!accounts.length) return { value: 0, missing: [] };
  const missing: string[] = [];
  let total = 0;
  for (const account of accounts) {
    if (account.hsaYtdTaxYear !== taxYear) {
      missing.push(`${account.name}: HSA YTD contributions are not bound to tax year ${taxYear}.`);
      continue;
    }
    if (account.employeeContributedYtd === null || account.employerContributedYtd === null) {
      missing.push(`${account.name}: employee and employer HSA YTD contributions are both required for tax year ${taxYear}.`);
      continue;
    }
    total += account.employeeContributedYtd + account.employerContributedYtd;
  }
  return missing.length ? { value: null, missing } : { value: roundMoney(total), missing: [] };
}

function monthOrdinaryLimit(fact: MonthFact, taxPolicy: MoneyPriorityTaxPolicy): number | null {
  if (fact.eligibility === "ineligible") return 0;
  if (fact.eligibility !== "eligible") return null;
  if (fact.coverage === "self_only") return taxPolicy.hsaSelfOnlyLimit / 12;
  if (fact.coverage === "family") return taxPolicy.hsaFamilyLimit / 12;
  return null;
}

export function evaluateHsaLegalCapacity(
  snapshot: MoneyPrioritySnapshot,
  taxPolicy: MoneyPriorityTaxPolicy,
): HsaLegalCapacityResult {
  const taxYear = taxPolicy.taxYear;
  const hsaAccounts = snapshot.retirementAccounts.filter((account) => account.type === "hsa");
  const byAccountId = new Map<string, HsaAccountLegalCapacity>();
  const warnings = new Set<string>();
  if (!hsaAccounts.length) return { byAccountId, warnings: [] };

  const accountOwners = [...new Set(hsaAccounts.map((account) => account.ownerPersonId).filter((id): id is string => Boolean(id)))];
  const marriedPeople = snapshot.people
    .filter((person) => person.isActive && !person.isDependent && (person.relationship === "self" || person.relationship === "spouse_partner"))
    .sort((a, b) => a.id.localeCompare(b.id));
  const marriedPairIds = marriedPeople.length === 2 ? marriedPeople.map((person) => person.id) : [];
  const relevantPeople = [...new Set([...accountOwners, ...marriedPairIds])].sort();
  const facts = new Map(relevantPeople.map((personId) => [personId, personMonthFacts(snapshot, personId, taxYear)] as const));

  for (const personId of relevantPeople) {
    const value = facts.get(personId)!;
    const ytd = aggregateOwnerYtd(snapshot, personId, taxYear);
    value.ytd = ytd.value;
    ytd.missing.forEach((item) => value.missingData.add(item));
    value.warnings.forEach((item) => warnings.add(item));
  }

  let sharedOrdinaryBase = 0;
  if (marriedPairIds.length === 2) {
    const [aId, bId] = marriedPairIds;
    const a = facts.get(aId)!;
    const b = facts.get(bId)!;
    for (let index = 0; index < 12; index += 1) {
      const month = index + 1;
      const am = a.months[index]!;
      const bm = b.months[index]!;

      if (am.eligibility === "unknown") a.missingData.add(`HSA month ${month} eligibility is unresolved for ${aId}.`);
      if (bm.eligibility === "unknown") b.missingData.add(`HSA month ${month} eligibility is unresolved for ${bId}.`);

      if (am.eligibility === "ineligible") {
        const bLimit = monthOrdinaryLimit(bm, taxPolicy);
        if (bLimit === null && bm.eligibility === "eligible") b.missingData.add(`HSA month ${month} coverage is unresolved for ${bId}.`);
        else b.independentOrdinary += bLimit ?? 0;
        continue;
      }
      if (bm.eligibility === "ineligible") {
        const aLimit = monthOrdinaryLimit(am, taxPolicy);
        if (aLimit === null && am.eligibility === "eligible") a.missingData.add(`HSA month ${month} coverage is unresolved for ${aId}.`);
        else a.independentOrdinary += aLimit ?? 0;
        continue;
      }

      if (am.eligibility === "eligible" && bm.eligibility === "eligible") {
        if (am.coverage === "family" || bm.coverage === "family") {
          sharedOrdinaryBase += taxPolicy.hsaFamilyLimit / 12;
          continue;
        }
        if (am.coverage === "self_only" && bm.coverage === "self_only") {
          a.independentOrdinary += taxPolicy.hsaSelfOnlyLimit / 12;
          b.independentOrdinary += taxPolicy.hsaSelfOnlyLimit / 12;
          continue;
        }
        a.missingData.add(`HSA month ${month} spouse coverage facts can change married-family sharing for ${taxYear}.`);
        b.missingData.add(`HSA month ${month} spouse coverage facts can change married-family sharing for ${taxYear}.`);
        continue;
      }

      if (am.eligibility === "eligible") {
        if (am.coverage === "self_only" && bm.coverage === "self_only") {
          a.independentOrdinary += taxPolicy.hsaSelfOnlyLimit / 12;
        } else {
          a.missingData.add(`HSA month ${month} spouse eligibility can change married-family sharing for ${taxYear}.`);
        }
        b.missingData.add(`HSA month ${month} eligibility is unresolved for ${bId}.`);
      } else if (bm.eligibility === "eligible") {
        if (bm.coverage === "self_only" && am.coverage === "self_only") {
          b.independentOrdinary += taxPolicy.hsaSelfOnlyLimit / 12;
        } else {
          b.missingData.add(`HSA month ${month} spouse eligibility can change married-family sharing for ${taxYear}.`);
        }
        a.missingData.add(`HSA month ${month} eligibility is unresolved for ${aId}.`);
      }
    }
  } else {
    for (const personId of relevantPeople) {
      const value = facts.get(personId)!;
      for (let index = 0; index < 12; index += 1) {
        const limit = monthOrdinaryLimit(value.months[index]!, taxPolicy);
        if (limit === null) value.missingData.add(`HSA month ${index + 1} eligibility/coverage is unresolved for ${personId}.`);
        else value.independentOrdinary += limit;
      }
    }
  }

  sharedOrdinaryBase = roundMoney(sharedOrdinaryBase);
  for (const value of facts.values()) value.independentOrdinary = roundMoney(value.independentOrdinary);

  if (marriedPairIds.length === 2) {
    const [aId, bId] = marriedPairIds;
    const a = facts.get(aId)!;
    const b = facts.get(bId)!;
    const allocation = snapshot.hsa.marriedAllocations.find((item) => item.taxYear === taxYear);
    if (allocation) {
      const allocationIds = [allocation.personOneId, allocation.personTwoId].sort();
      if (allocationIds[0] !== aId || allocationIds[1] !== bId) {
        a.missingData.add(`The ${taxYear} alternate married HSA allocation does not reference the active spouse pair.`);
        b.missingData.add(`The ${taxYear} alternate married HSA allocation does not reference the active spouse pair.`);
      } else if (roundMoney(allocation.personOneOrdinaryAmount + allocation.personTwoOrdinaryAmount) > sharedOrdinaryBase) {
        a.missingData.add(`The ${taxYear} alternate married HSA allocation exceeds the period-aware shared ordinary base of $${sharedOrdinaryBase.toFixed(2)}.`);
        b.missingData.add(`The ${taxYear} alternate married HSA allocation exceeds the period-aware shared ordinary base of $${sharedOrdinaryBase.toFixed(2)}.`);
      } else {
        a.sharedOrdinaryAllocation = allocation.personOneId === aId ? allocation.personOneOrdinaryAmount : allocation.personTwoOrdinaryAmount;
        b.sharedOrdinaryAllocation = allocation.personOneId === bId ? allocation.personOneOrdinaryAmount : allocation.personTwoOrdinaryAmount;
        a.reasons.add("An explicit tax-year-bound alternate married-family HSA ordinary allocation is applied.");
        b.reasons.add("An explicit tax-year-bound alternate married-family HSA ordinary allocation is applied.");
      }
    } else {
      a.sharedOrdinaryAllocation = sharedOrdinaryBase / 2;
      b.sharedOrdinaryAllocation = sharedOrdinaryBase / 2;
      if (sharedOrdinaryBase > 0) {
        a.reasons.add("The married-family shared ordinary HSA base uses the equal allocation default because no alternate agreement is recorded.");
        b.reasons.add("The married-family shared ordinary HSA base uses the equal allocation default because no alternate agreement is recorded.");
      }
    }
    a.sharedOrdinaryAllocation = roundMoney(a.sharedOrdinaryAllocation);
    b.sharedOrdinaryAllocation = roundMoney(b.sharedOrdinaryAllocation);
  }

  for (const value of facts.values()) {
    if (value.age !== null && value.age >= 55) {
      const eligibleMonths = value.months.filter((month) => month.eligibility === "eligible").length;
      value.catchUpCapacity = roundMoney((taxPolicy.hsaCatchUpAge55 * eligibleMonths) / 12);
    }
    if (!value.missingData.size) {
      value.annualCeiling = roundMoney(value.independentOrdinary + value.sharedOrdinaryAllocation + value.catchUpCapacity);
      value.remaining = value.ytd === null ? null : roundMoney(Math.max(0, value.annualCeiling - value.ytd));
    }
  }

  let marriedSharedRemaining: number | null = null;
  let marriedAggregateExcess = false;
  if (marriedPairIds.length === 2) {
    const [aId, bId] = marriedPairIds;
    const a = facts.get(aId)!;
    const b = facts.get(bId)!;
    const allocation = snapshot.hsa.marriedAllocations.find((item) => item.taxYear === taxYear);
    if (!a.missingData.size && !b.missingData.size && a.annualCeiling !== null && b.annualCeiling !== null && a.ytd !== null && b.ytd !== null) {
      const totalCeiling = roundMoney(a.annualCeiling + b.annualCeiling);
      const totalYtd = roundMoney(a.ytd + b.ytd);
      marriedSharedRemaining = roundMoney(Math.max(0, totalCeiling - totalYtd));
      marriedAggregateExcess = totalYtd > totalCeiling;

      if (!allocation && !marriedAggregateExcess && sharedOrdinaryBase > 0) {
        const aNeedsAlternate = a.ytd > a.annualCeiling;
        const bNeedsAlternate = b.ytd > b.annualCeiling;
        if (aNeedsAlternate || bNeedsAlternate) {
          const aRequiredShared = Math.max(0, a.ytd - a.independentOrdinary - a.catchUpCapacity);
          const bRequiredShared = Math.max(0, b.ytd - b.independentOrdinary - b.catchUpCapacity);
          const alternateFeasible = roundMoney(aRequiredShared + bRequiredShared) <= sharedOrdinaryBase;
          if (alternateFeasible) {
            const message = `Existing ${taxYear} HSA YTD contributions do not fit the equal married-family ordinary allocation, but a legal alternate allocation could fit; confirm the spouses' actual agreement.`;
            a.missingData.add(message);
            b.missingData.add(message);
            a.annualCeiling = null; b.annualCeiling = null;
            a.remaining = null; b.remaining = null;
            marriedSharedRemaining = null;
          }
        }
      }

      if (marriedAggregateExcess) {
        warnings.add(`possible_excess_hsa_contribution:married-family:${taxYear}: aggregate HSA YTD exceeds the supported couple legal maximum.`);
        a.remaining = 0;
        b.remaining = 0;
        marriedSharedRemaining = 0;
      } else if (allocation) {
        if (a.ytd > a.annualCeiling) warnings.add(`possible_excess_hsa_contribution:${aId}:${taxYear}: owner HSA YTD exceeds the explicit allocated owner ceiling.`);
        if (b.ytd > b.annualCeiling) warnings.add(`possible_excess_hsa_contribution:${bId}:${taxYear}: owner HSA YTD exceeds the explicit allocated owner ceiling.`);
      }
    }
  }

  for (const account of hsaAccounts) {
    if (!account.ownerPersonId) {
      byAccountId.set(account.id, {
        accountId: account.id,
        ownerPersonId: null,
        state: "more_information_needed",
        annualLimit: null,
        contributedYtd: null,
        remainingAnnualRoom: null,
        catchUpEligible: false,
        catchUpAmount: 0,
        sharedCapacityGroup: null,
        sharedCapacityRemainingRoom: null,
        capacityBasis: null,
        reasons: [],
        missingData: ["HSA owner is required to evaluate person/tax-year legal capacity."],
      });
      continue;
    }
    const value = facts.get(account.ownerPersonId);
    if (!value) {
      byAccountId.set(account.id, {
        accountId: account.id,
        ownerPersonId: account.ownerPersonId,
        state: "more_information_needed",
        annualLimit: null,
        contributedYtd: null,
        remainingAnnualRoom: null,
        catchUpEligible: false,
        catchUpAmount: 0,
        sharedCapacityGroup: `hsa:${account.ownerPersonId}`,
        sharedCapacityRemainingRoom: null,
        capacityBasis: null,
        reasons: [],
        missingData: [`Canonical HSA person/tax-year facts are required for ${account.ownerPersonId}.`],
      });
      continue;
    }

    const missingData = [...value.missingData].sort();
    const married = marriedPairIds.includes(account.ownerPersonId) && sharedOrdinaryBase > 0;
    const annualLimit = value.annualCeiling;
    const contributedYtd = value.ytd;
    const remainingAnnualRoom = missingData.length ? null : value.remaining;
    const noEligibleMonths = value.months.every((month) => month.eligibility === "ineligible");
    const state: HsaLegalCapacityState = missingData.length
      ? "more_information_needed"
      : noEligibleMonths && annualLimit === 0
        ? "not_eligible"
        : (remainingAnnualRoom ?? 0) > 0
          ? "available"
          : "limit_reached";

    byAccountId.set(account.id, {
      accountId: account.id,
      ownerPersonId: account.ownerPersonId,
      state,
      annualLimit,
      contributedYtd,
      remainingAnnualRoom,
      catchUpEligible: value.age !== null && value.age >= 55 && value.catchUpCapacity > 0,
      catchUpAmount: value.catchUpCapacity,
      sharedCapacityGroup: married ? "hsa:married-family" : `hsa:${account.ownerPersonId}`,
      sharedCapacityRemainingRoom: married ? marriedSharedRemaining : remainingAnnualRoom,
      capacityBasis: missingData.length ? null : value.basis,
      reasons: [...value.reasons].sort(),
      missingData,
    });
  }

  return { byAccountId, warnings: [...warnings].sort() };
}