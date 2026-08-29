import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  MONEY_PRIORITY_TAX_POLICY_2026,
  type MoneyPriorityTaxPolicy,
} from "./money-priority-tax-policy.ts";

export type RetirementAccountOpportunityState =
  | "available"
  | "limit_reached"
  | "not_eligible"
  | "more_information_needed";

export type RetirementAccountOpportunity = {
  accountId: string;
  accountName: string;
  accountType: string;
  ownerPersonId: string | null;
  state: RetirementAccountOpportunityState;
  annualLimit: number | null;
  contributedYtd: number | null;
  remainingAnnualRoom: number | null;
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
  let limit = taxPolicy.workplaceEmployeeDeferralLimit;
  if (age !== null && age >= 60 && age <= 63) return limit + taxPolicy.workplaceCatchUpAge60To63;
  if (age !== null && age >= 50) limit += taxPolicy.workplaceCatchUpAge50;
  return limit;
}

function iraLimit(age: number | null, taxPolicy: MoneyPriorityTaxPolicy): number {
  return taxPolicy.iraCombinedLimit + (age !== null && age >= 50 ? taxPolicy.iraCatchUpAge50 : 0);
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
    if (existing === null || account.employeeContributedYtd === null) {
      workplaceYtdByOwner.set(account.ownerPersonId, null);
    } else {
      workplaceYtdByOwner.set(account.ownerPersonId, roundMoney((existing ?? 0) + account.employeeContributedYtd));
    }
  }

  const iraYtdByOwner = new Map<string, number | null>();
  for (const account of snapshot.retirementAccounts.filter((item) => item.type === "traditional_ira" || item.type === "roth_ira")) {
    if (!account.ownerPersonId) continue;
    const existing = iraYtdByOwner.get(account.ownerPersonId);
    if (existing === null || account.employeeContributedYtd === null) {
      iraYtdByOwner.set(account.ownerPersonId, null);
    } else {
      iraYtdByOwner.set(account.ownerPersonId, roundMoney((existing ?? 0) + account.employeeContributedYtd));
    }
  }

  for (const account of snapshot.retirementAccounts) {
    const age = ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear);
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
        opportunities.push({
          accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "not_eligible", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          reasons: ["The household profile marks this account owner as not currently HSA-eligible."], missingData: [],
        });
        continue;
      }

      if (missingData.length) {
        opportunities.push({
          accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          reasons: [], missingData,
        });
        continue;
      }

      const baseLimit = account.hsaCoverageType === "family"
        ? taxPolicy.hsaFamilyLimit
        : account.hsaCoverageType === "self_only"
          ? taxPolicy.hsaSelfOnlyLimit
          : null;
      if (baseLimit === null) {
        opportunities.push({
          accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          reasons: [], missingData: ["HSA coverage type must be self_only or family."],
        });
        continue;
      }

      const annualLimit = baseLimit + (age !== null && age >= 55 ? taxPolicy.hsaCatchUpAge55 : 0);
      const contributedYtd = roundMoney(account.employeeContributedYtd! + account.employerContributedYtd!);
      const remainingAnnualRoom = roundMoney(Math.max(0, annualLimit - contributedYtd));
      opportunities.push({
        accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
        state: remainingAnnualRoom > 0 ? "available" : "limit_reached", annualLimit, contributedYtd, remainingAnnualRoom,
        reasons: ["HSA employee and employer contributions are combined against the annual HSA limit."], missingData: [],
      });
      continue;
    }

    if (sharedWorkplaceTypes.has(account.type) || account.type === "457b") {
      const missingData: string[] = [];
      if (missingOwner) missingData.push("Account owner is required to evaluate catch-up eligibility and shared deferral limits.");
      const contributedYtd = account.type === "457b"
        ? account.employeeContributedYtd
        : account.ownerPersonId ? (workplaceYtdByOwner.get(account.ownerPersonId) ?? null) : null;
      if (contributedYtd === null) missingData.push("Employee contributions YTD are required to calculate remaining elective-deferral room.");

      if (missingData.length) {
        opportunities.push({
          accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
          state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null,
          reasons: [], missingData,
        });
        continue;
      }

      const annualLimit = workplaceLimit(age, taxPolicy);
      const remainingAnnualRoom = roundMoney(Math.max(0, annualLimit - contributedYtd!));
      opportunities.push({
        accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
        state: remainingAnnualRoom > 0 ? "available" : "limit_reached", annualLimit,
        contributedYtd: roundMoney(contributedYtd!), remainingAnnualRoom,
        reasons: [
          account.type === "457b"
            ? "Governmental 457(b) elective-deferral room is evaluated separately from the shared 401(k)/403(b)/TSP grouping in this model."
            : "401(k), 403(b), and TSP employee deferrals are aggregated by owner before remaining room is calculated.",
        ],
        missingData: [],
      });
      continue;
    }

    if (account.type === "traditional_ira" || account.type === "roth_ira") {
      const missingData: string[] = [];
      if (missingOwner) missingData.push("IRA owner is required to evaluate the age-based IRA limit.");
      const contributedYtd = account.ownerPersonId ? (iraYtdByOwner.get(account.ownerPersonId) ?? null) : null;
      if (contributedYtd === null) missingData.push("Traditional and Roth IRA contributions YTD are required because they share one annual IRA limit.");
      missingData.push(
        account.type === "roth_ira"
          ? "Filing status and modified AGI are required to confirm direct Roth IRA eligibility."
          : "Filing status, modified AGI, and workplace-plan coverage are required to evaluate Traditional IRA deductibility.",
      );

      opportunities.push({
        accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId,
        state: "more_information_needed",
        annualLimit: missingOwner ? null : iraLimit(age, taxPolicy),
        contributedYtd: contributedYtd === null ? null : roundMoney(contributedYtd),
        remainingAnnualRoom: contributedYtd === null || missingOwner ? null : roundMoney(Math.max(0, iraLimit(age, taxPolicy) - contributedYtd)),
        reasons: ["Traditional and Roth IRAs share one annual contribution limit per person."],
        missingData,
      });
      continue;
    }

    warnings.push(`${account.name}: account-specific annual-limit guidance is not implemented for ${account.type}.`);
  }

  return { taxYear: taxPolicy.taxYear, taxPolicyVersion: taxPolicy.version, opportunities, warnings };
}
