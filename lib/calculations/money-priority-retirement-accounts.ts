import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  MONEY_PRIORITY_TAX_POLICY_2026,
  type FilingStatus,
  type MoneyPriorityTaxPolicy,
} from "./money-priority-tax-policy.ts";

export type RetirementAccountOpportunityState =
  | "available"
  | "limit_reached"
  | "not_eligible"
  | "more_information_needed";

export type RetirementTaxStatus = "full" | "partial" | "none" | "unknown" | "not_applicable";

export type RetirementAccountOpportunity = {
  accountId: string;
  accountName: string;
  accountType: string;
  ownerPersonId: string | null;
  state: RetirementAccountOpportunityState;
  annualLimit: number | null;
  contributedYtd: number | null;
  remainingAnnualRoom: number | null;
  taxEligibility: RetirementTaxStatus;
  taxDeductibility: RetirementTaxStatus;
  reasons: string[];
  missingData: string[];
};

export type RetirementAccountOpportunityResult = {
  taxYear: number;
  taxPolicyVersion: string;
  opportunities: RetirementAccountOpportunity[];
  warnings: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageAtYearEnd(snapshot: MoneyPrioritySnapshot, personId: string | null, taxYear: number): number | null {
  if (!personId) return null;
  const person = snapshot.people.find((item) => item.id === personId);
  if (!person?.birthDate) return null;
  const birth = parseIsoDate(person.birthDate);
  if (!birth) return null;
  return taxYear - birth.getUTCFullYear();
}

function workplaceLimit(age: number | null, taxPolicy: MoneyPriorityTaxPolicy): number {
  const base = taxPolicy.workplaceEmployeeDeferralLimit;
  if (age !== null && age >= 60 && age <= 63) return base + taxPolicy.workplaceCatchUpAge60To63;
  if (age !== null && age >= 50) return base + taxPolicy.workplaceCatchUpAge50;
  return base;
}

function iraStatutoryLimit(age: number | null, taxPolicy: MoneyPriorityTaxPolicy): number {
  return taxPolicy.iraCombinedLimit + (age !== null && age >= 50 ? taxPolicy.iraCatchUpAge50 : 0);
}

function taxProfile(snapshot: MoneyPrioritySnapshot, taxPolicy: MoneyPriorityTaxPolicy): {
  filingStatus: FilingStatus | null;
  modifiedAgi: number | null;
  livedWithSpouse: boolean | null;
  missingData: string[];
} {
  const missingData: string[] = [];
  const prefs = snapshot.preferences;
  if (!prefs || prefs.taxProfileYear !== taxPolicy.taxYear) {
    missingData.push(`Tax profile year must be ${taxPolicy.taxYear}.`);
  }
  const filingStatus = prefs?.taxFilingStatus as FilingStatus | null ?? null;
  if (!filingStatus) missingData.push("Tax filing status is required for IRA tax eligibility guidance.");
  const modifiedAgi = prefs?.estimatedModifiedAgi ?? null;
  if (modifiedAgi === null) missingData.push("Estimated modified AGI is required for IRA tax eligibility guidance.");
  if (filingStatus === "married_filing_separately" && prefs?.livedWithSpouseDuringTaxYear === null) {
    missingData.push("Married-filing-separately IRA rules require whether the spouses lived together during the tax year.");
  }
  return {
    filingStatus,
    modifiedAgi,
    livedWithSpouse: prefs?.livedWithSpouseDuringTaxYear ?? null,
    missingData,
  };
}

function rothPhaseoutRange(
  filingStatus: FilingStatus,
  livedWithSpouse: boolean | null,
  taxPolicy: MoneyPriorityTaxPolicy,
): { start: number; end: number } | null {
  if (filingStatus === "single" || filingStatus === "head_of_household") {
    return taxPolicy.rothIraPhaseout.singleOrHeadOfHousehold;
  }
  if (filingStatus === "married_filing_jointly") return taxPolicy.rothIraPhaseout.marriedFilingJointly;
  if (livedWithSpouse === false) return taxPolicy.rothIraPhaseout.singleOrHeadOfHousehold;
  if (livedWithSpouse === true) return taxPolicy.rothIraPhaseout.marriedFilingSeparately;
  return null;
}

function reducedRothLimit(maxContribution: number, modifiedAgi: number, range: { start: number; end: number }): {
  limit: number;
  status: RetirementTaxStatus;
} {
  if (modifiedAgi < range.start) return { limit: maxContribution, status: "full" };
  if (modifiedAgi >= range.end) return { limit: 0, status: "none" };
  const fraction = Math.min(1, Math.max(0, (modifiedAgi - range.start) / (range.end - range.start)));
  const rawLimit = maxContribution * (1 - fraction);
  let limit = Math.ceil(rawLimit / 10) * 10;
  if (limit > 0 && limit < 200) limit = 200;
  limit = Math.min(maxContribution, limit);
  return { limit: roundMoney(limit), status: "partial" };
}

function traditionalDeductibility(
  snapshot: MoneyPrioritySnapshot,
  ownerPersonId: string,
  filingStatus: FilingStatus,
  modifiedAgi: number,
  livedWithSpouse: boolean | null,
  taxPolicy: MoneyPriorityTaxPolicy,
): { status: RetirementTaxStatus; reason: string; missingData: string[] } {
  const owner = snapshot.people.find((item) => item.id === ownerPersonId);
  if (!owner || owner.coveredByWorkplaceRetirementPlan === null) {
    return { status: "unknown", reason: "", missingData: ["Workplace-retirement-plan coverage is required for the IRA owner."] };
  }

  let range: { start: number; end: number } | null = null;
  if (owner.coveredByWorkplaceRetirementPlan) {
    if (filingStatus === "single" || filingStatus === "head_of_household") {
      range = taxPolicy.traditionalIraDeductionPhaseout.coveredSingleOrHeadOfHousehold;
    } else if (filingStatus === "married_filing_jointly") {
      range = taxPolicy.traditionalIraDeductionPhaseout.coveredMarriedFilingJointly;
    } else if (livedWithSpouse === true) {
      range = taxPolicy.traditionalIraDeductionPhaseout.coveredMarriedFilingSeparately;
    } else if (livedWithSpouse === false) {
      range = taxPolicy.traditionalIraDeductionPhaseout.coveredSingleOrHeadOfHousehold;
    } else {
      return { status: "unknown", reason: "", missingData: ["Married-filing-separately deductibility requires spouse-living context."] };
    }
  } else if (filingStatus === "married_filing_jointly") {
    const spouse = snapshot.people.find((item) => item.isActive && item.relationship === "spouse");
    if (!spouse || spouse.coveredByWorkplaceRetirementPlan === null) {
      return { status: "unknown", reason: "", missingData: ["Spouse workplace-retirement-plan coverage is required for Traditional IRA deductibility guidance."] };
    }
    if (!spouse.coveredByWorkplaceRetirementPlan) {
      return { status: "full", reason: "Neither spouse is marked as covered by a workplace retirement plan.", missingData: [] };
    }
    range = taxPolicy.traditionalIraDeductionPhaseout.contributorNotCoveredSpouseCoveredMarriedFilingJointly;
  } else if (filingStatus === "single" || filingStatus === "head_of_household") {
    return { status: "full", reason: "The IRA owner is not marked as covered by a workplace retirement plan.", missingData: [] };
  } else {
    return { status: "unknown", reason: "", missingData: ["Married-filing-separately deductibility is not determined safely from the current spouse coverage profile."] };
  }

  if (modifiedAgi < range.start) return { status: "full", reason: "Estimated modified AGI is below the applicable Traditional IRA deduction phaseout.", missingData: [] };
  if (modifiedAgi >= range.end) return { status: "none", reason: "Estimated modified AGI is at or above the applicable Traditional IRA deduction phaseout ceiling.", missingData: [] };
  return { status: "partial", reason: "Estimated modified AGI falls inside the applicable Traditional IRA deduction phaseout range.", missingData: [] };
}

export function evaluateRetirementAccountOpportunities(
  snapshot: MoneyPrioritySnapshot,
  taxPolicy: MoneyPriorityTaxPolicy = MONEY_PRIORITY_TAX_POLICY_2026,
): RetirementAccountOpportunityResult {
  const opportunities: RetirementAccountOpportunity[] = [];
  const warnings: string[] = [];

  const sharedWorkplaceTypes = new Set(["401k", "403b", "tsp"]);
  const workplaceYtdByOwner = new Map<string, number | null>();
  for (const account of snapshot.retirementAccounts.filter((item) => sharedWorkplaceTypes.has(item.type))) {
    if (!account.ownerPersonId) continue;
    const existing = workplaceYtdByOwner.get(account.ownerPersonId);
    if (existing === null || account.employeeContributedYtd === null) workplaceYtdByOwner.set(account.ownerPersonId, null);
    else workplaceYtdByOwner.set(account.ownerPersonId, roundMoney((existing ?? 0) + account.employeeContributedYtd));
  }

  const iraAccounts = snapshot.retirementAccounts.filter((item) => item.type === "traditional_ira" || item.type === "roth_ira");
  const iraYtdByOwner = new Map<string, number | null>();
  const rothYtdByOwner = new Map<string, number | null>();
  for (const account of iraAccounts) {
    if (!account.ownerPersonId) continue;
    const existing = iraYtdByOwner.get(account.ownerPersonId);
    if (existing === null || account.employeeContributedYtd === null) iraYtdByOwner.set(account.ownerPersonId, null);
    else iraYtdByOwner.set(account.ownerPersonId, roundMoney((existing ?? 0) + account.employeeContributedYtd));
    if (account.type === "roth_ira") {
      const existingRoth = rothYtdByOwner.get(account.ownerPersonId);
      if (existingRoth === null || account.employeeContributedYtd === null) rothYtdByOwner.set(account.ownerPersonId, null);
      else rothYtdByOwner.set(account.ownerPersonId, roundMoney((existingRoth ?? 0) + account.employeeContributedYtd));
    }
  }

  const profile = taxProfile(snapshot, taxPolicy);

  for (const account of snapshot.retirementAccounts) {
    const age = ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear);
    const owner = account.ownerPersonId ? snapshot.people.find((item) => item.id === account.ownerPersonId) : undefined;
    const missingOwner = !account.ownerPersonId;

    if (account.type === "hsa") {
      const missingData: string[] = [];
      if (missingOwner) missingData.push("HSA owner is required to evaluate age-based catch-up eligibility.");
      if (account.hsaEligible === null) missingData.push("HSA eligibility is unknown.");
      if (!account.hsaCoverageType) missingData.push("HSA coverage type is required to select the annual contribution limit.");
      if (account.employeeContributedYtd === null || account.employerContributedYtd === null) {
        missingData.push("Both employee and employer HSA contributions YTD are required because both count toward the annual limit.");
      }

      if (account.hsaEligible === false) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "not_eligible", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          taxEligibility: "none", taxDeductibility: "not_applicable",
          reasons: ["The household profile marks this account owner as not currently HSA-eligible."], missingData: [] });
        continue;
      }
      if (missingData.length) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          taxEligibility: "unknown", taxDeductibility: "not_applicable", reasons: [], missingData });
        continue;
      }

      const baseLimit = account.hsaCoverageType === "family" ? taxPolicy.hsaFamilyLimit
        : account.hsaCoverageType === "self_only" ? taxPolicy.hsaSelfOnlyLimit : null;
      if (baseLimit === null) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          taxEligibility: "unknown", taxDeductibility: "not_applicable", reasons: [], missingData: ["HSA coverage type must be self_only or family."] });
        continue;
      }
      const annualLimit = baseLimit + (age !== null && age >= 55 ? taxPolicy.hsaCatchUpAge55 : 0);
      const contributedYtd = roundMoney(account.employeeContributedYtd! + account.employerContributedYtd!);
      const remainingAnnualRoom = roundMoney(Math.max(0, annualLimit - contributedYtd));
      opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
        state: remainingAnnualRoom > 0 ? "available" : "limit_reached", annualLimit, contributedYtd, remainingAnnualRoom,
        taxEligibility: "full", taxDeductibility: "not_applicable",
        reasons: ["HSA employee and employer contributions are combined against the annual HSA limit."], missingData: [] });
      continue;
    }

    if (sharedWorkplaceTypes.has(account.type) || account.type === "457b") {
      const missingData: string[] = [];
      if (missingOwner) missingData.push("Account owner is required to evaluate catch-up eligibility and shared deferral limits.");
      const contributedYtd = account.type === "457b" ? account.employeeContributedYtd
        : account.ownerPersonId ? (workplaceYtdByOwner.get(account.ownerPersonId) ?? null) : null;
      if (contributedYtd === null) missingData.push("Employee contributions YTD are required to calculate remaining elective-deferral room.");
      if (missingData.length) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          taxEligibility: "unknown", taxDeductibility: "not_applicable", reasons: [], missingData });
        continue;
      }
      const annualLimit = workplaceLimit(age, taxPolicy);
      const remainingAnnualRoom = roundMoney(Math.max(0, annualLimit - contributedYtd!));
      opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
        state: remainingAnnualRoom > 0 ? "available" : "limit_reached", annualLimit, contributedYtd: roundMoney(contributedYtd!), remainingAnnualRoom,
        taxEligibility: "full", taxDeductibility: "not_applicable",
        reasons: [account.type === "457b"
          ? "Governmental 457(b) elective-deferral room is evaluated separately from the shared 401(k)/403(b)/TSP grouping in this model."
          : "401(k), 403(b), and TSP employee deferrals are aggregated by owner before remaining room is calculated."], missingData: [] });
      continue;
    }

    if (account.type === "roth_ira" || account.type === "traditional_ira") {
      const missingData = [...profile.missingData];
      if (missingOwner) missingData.push("IRA owner is required to evaluate the age-based IRA limit.");
      if (!owner || owner.estimatedTaxableCompensationAnnual === null) missingData.push("Estimated taxable compensation is required for the IRA owner.");
      const totalIraYtd = account.ownerPersonId ? (iraYtdByOwner.get(account.ownerPersonId) ?? null) : null;
      if (totalIraYtd === null) missingData.push("Traditional and Roth IRA contributions YTD are required because they share one annual IRA limit.");

      const statutoryLimit = missingOwner ? null : iraStatutoryLimit(age, taxPolicy);
      const compensationLimit = owner?.estimatedTaxableCompensationAnnual ?? null;
      const maxContribution = statutoryLimit === null || compensationLimit === null ? null : Math.min(statutoryLimit, compensationLimit);
      const combinedRemaining = maxContribution === null || totalIraYtd === null ? null : roundMoney(Math.max(0, maxContribution - totalIraYtd));

      if (account.type === "roth_ira") {
        const range = profile.filingStatus ? rothPhaseoutRange(profile.filingStatus, profile.livedWithSpouse, taxPolicy) : null;
        if (profile.filingStatus === "married_filing_separately" && range === null) {
          if (!missingData.some((item) => item.includes("spouses lived together"))) missingData.push("Married-filing-separately Roth eligibility requires spouse-living context.");
        }
        if (missingData.length || maxContribution === null || profile.modifiedAgi === null || range === null) {
          opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
            state: "more_information_needed", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining,
            taxEligibility: "unknown", taxDeductibility: "not_applicable",
            reasons: ["Traditional and Roth IRAs share one annual contribution limit per person."], missingData: [...new Set(missingData)] });
          continue;
        }
        const direct = reducedRothLimit(maxContribution, profile.modifiedAgi, range);
        const rothYtd = rothYtdByOwner.get(account.ownerPersonId!) ?? 0;
        const directRothRemaining = roundMoney(Math.max(0, direct.limit - rothYtd));
        const remainingAnnualRoom = roundMoney(Math.min(directRothRemaining, combinedRemaining ?? 0));
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: direct.status === "none" ? "not_eligible" : remainingAnnualRoom > 0 ? "available" : "limit_reached",
          annualLimit: direct.limit, contributedYtd: roundMoney(rothYtd), remainingAnnualRoom,
          taxEligibility: direct.status, taxDeductibility: "not_applicable",
          reasons: [
            direct.status === "full" ? "Estimated modified AGI is below the direct Roth IRA phaseout range."
              : direct.status === "partial" ? "Estimated modified AGI falls inside the direct Roth IRA phaseout range, so the IRS reduced-limit worksheet applies."
                : "Estimated modified AGI is at or above the direct Roth IRA phaseout ceiling.",
            "Traditional and Roth IRAs share one annual contribution limit per person.",
          ], missingData: [] });
        continue;
      }

      const deductibilityMissing = [...missingData];
      if (deductibilityMissing.length || maxContribution === null || totalIraYtd === null || !profile.filingStatus || profile.modifiedAgi === null || !account.ownerPersonId) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining,
          taxEligibility: maxContribution !== null && maxContribution > 0 ? "full" : "unknown", taxDeductibility: "unknown",
          reasons: ["Traditional IRA contribution eligibility and tax deductibility are separate decisions."], missingData: [...new Set(deductibilityMissing)] });
        continue;
      }
      const deduction = traditionalDeductibility(snapshot, account.ownerPersonId, profile.filingStatus, profile.modifiedAgi, profile.livedWithSpouse, taxPolicy);
      if (deduction.missingData.length) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining,
          taxEligibility: "full", taxDeductibility: "unknown", reasons: ["Traditional IRA contributions may still be allowed even when the deduction is limited."], missingData: deduction.missingData });
        continue;
      }
      opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
        state: (combinedRemaining ?? 0) > 0 ? "available" : "limit_reached", annualLimit: maxContribution,
        contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining, taxEligibility: "full", taxDeductibility: deduction.status,
        reasons: ["Traditional and Roth IRAs share one annual contribution limit per person.", deduction.reason], missingData: [] });
      continue;
    }

    warnings.push(`${account.name}: account-specific annual-limit guidance is not implemented for ${account.type}.`);
  }

  return { taxYear: taxPolicy.taxYear, taxPolicyVersion: taxPolicy.version, opportunities, warnings };
}
