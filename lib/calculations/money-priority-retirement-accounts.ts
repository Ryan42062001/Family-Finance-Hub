import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateHsaLegalCapacity, type HsaLegalCapacityBasis } from "./money-priority-hsa-legal-capacity.ts";
import {
  MONEY_PRIORITY_TAX_POLICY_2026,
  type FilingStatus,
  type MoneyPriorityTaxPolicy,
} from "./money-priority-tax-policy.ts";

export type RetirementAccountOpportunityState = "available" | "limit_reached" | "not_eligible" | "more_information_needed";
export type RetirementTaxStatus = "full" | "partial" | "none" | "unknown" | "not_applicable";
export type RetirementOpportunityTier = "employer_match" | "strong_tax_advantaged" | "diversification_opportunity" | "secondary_tax_advantaged" | "unavailable_or_unknown";

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
  contributionSource?: "employee" | "employer";
  opportunityTier?: RetirementOpportunityTier;
  catchUpEligible?: boolean;
  catchUpAmount?: number;
  catchUpMustBeRoth?: boolean | null;
  sharedCapacityGroup?: string | null;
  sharedCapacityRemainingRoom?: number | null;
  sharedOrdinaryRemainingRoom?: number | null;
  ownerCatchUpRemainingRoom?: number | null;
  hsaCatchUpAttributionVerified?: boolean;
  hsaCapacityBasis?: HsaLegalCapacityBasis | null;
  annualAdditionsLimit?: number | null;
  annualAdditionsYtd?: number | null;
  compensationLimitApplied?: number | null;
};

export type RetirementAccountOpportunityResult = {
  taxYear: number;
  taxPolicyVersion: string;
  opportunities: RetirementAccountOpportunity[];
  warnings: string[];
};

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function parseIsoDate(value: string): Date | null { const date = new Date(`${value}T00:00:00.000Z`); return Number.isNaN(date.getTime()) ? null : date; }
function ageAtYearEnd(snapshot: MoneyPrioritySnapshot, personId: string | null, taxYear: number): number | null {
  if (!personId) return null;
  const person = snapshot.people.find((item) => item.id === personId);
  if (!person?.birthDate) return null;
  const birth = parseIsoDate(person.birthDate);
  return birth ? taxYear - birth.getUTCFullYear() : null;
}
function workplaceLimit(age: number | null, taxPolicy: MoneyPriorityTaxPolicy): number {
  const base = taxPolicy.workplaceEmployeeDeferralLimit;
  if (age !== null && age >= 60 && age <= 63) return base + taxPolicy.workplaceCatchUpAge60To63;
  if (age !== null && age >= 50) return base + taxPolicy.workplaceCatchUpAge50;
  return base;
}
function simpleLimit(age: number | null, higherLimit: boolean, taxPolicy: MoneyPriorityTaxPolicy): number {
  const base = higherLimit ? taxPolicy.simpleApplicableHigherEmployeeDeferralLimit : taxPolicy.simpleEmployeeDeferralLimit;
  if (age !== null && age >= 60 && age <= 63) return base + taxPolicy.simpleCatchUpAge60To63;
  if (age !== null && age >= 50) return base + taxPolicy.simpleCatchUpAge50;
  return base;
}
function catchUpAmount(age: number | null, type: string, taxPolicy: MoneyPriorityTaxPolicy): number {
  if (age === null || age < 50) return 0;
  if (type === "simple_ira") return age >= 60 && age <= 63 ? taxPolicy.simpleCatchUpAge60To63 : taxPolicy.simpleCatchUpAge50;
  if (type === "traditional_ira" || type === "roth_ira") return taxPolicy.iraCatchUpAge50;
  return age >= 60 && age <= 63 ? taxPolicy.workplaceCatchUpAge60To63 : taxPolicy.workplaceCatchUpAge50;
}
function qualityTier(account: MoneyPrioritySnapshot["retirementAccounts"][number], state: RetirementAccountOpportunityState, eligibility: RetirementTaxStatus, deductibility: RetirementTaxStatus, householdHasPretax: boolean, householdHasRoth: boolean): RetirementOpportunityTier {
  if (account.matchStatus === "not_fully_captured") return "employer_match";
  if (state !== "available") return "unavailable_or_unknown";
  if (["hsa", "401k", "403b", "457b", "tsp", "simple_ira"].includes(account.type)) return "strong_tax_advantaged";
  if (account.type === "roth_ira" && (eligibility === "full" || eligibility === "partial")) return householdHasPretax && !householdHasRoth ? "diversification_opportunity" : "strong_tax_advantaged";
  if (account.type === "traditional_ira") {
    if (deductibility === "full" || deductibility === "partial") return householdHasRoth && !householdHasPretax ? "diversification_opportunity" : "strong_tax_advantaged";
    return deductibility === "none" ? "secondary_tax_advantaged" : "unavailable_or_unknown";
  }
  return "secondary_tax_advantaged";
}
function iraStatutoryLimit(age: number | null, taxPolicy: MoneyPriorityTaxPolicy): number { return taxPolicy.iraCombinedLimit + (age !== null && age >= 50 ? taxPolicy.iraCatchUpAge50 : 0); }
function taxProfile(snapshot: MoneyPrioritySnapshot, taxPolicy: MoneyPriorityTaxPolicy) {
  const missingData: string[] = [];
  const prefs = snapshot.preferences;
  if (!prefs || prefs.taxProfileYear !== taxPolicy.taxYear) missingData.push(`Tax profile year must be ${taxPolicy.taxYear}.`);
  const filingStatus = (prefs?.taxFilingStatus as FilingStatus | null) ?? null;
  if (!filingStatus) missingData.push("Tax filing status is required for IRA tax eligibility guidance.");
  const modifiedAgi = prefs?.estimatedModifiedAgi ?? null;
  if (modifiedAgi === null) missingData.push("Estimated modified AGI is required for IRA tax eligibility guidance.");
  if (filingStatus === "married_filing_separately" && prefs?.livedWithSpouseDuringTaxYear === null) missingData.push("Married-filing-separately IRA rules require whether the spouses lived together during the tax year.");
  return { filingStatus, modifiedAgi, livedWithSpouse: prefs?.livedWithSpouseDuringTaxYear ?? null, missingData };
}
function rothPhaseoutRange(filingStatus: FilingStatus, livedWithSpouse: boolean | null, taxPolicy: MoneyPriorityTaxPolicy): { start: number; end: number } | null {
  if (filingStatus === "single" || filingStatus === "head_of_household") return taxPolicy.rothIraPhaseout.singleOrHeadOfHousehold;
  if (filingStatus === "married_filing_jointly") return taxPolicy.rothIraPhaseout.marriedFilingJointly;
  if (livedWithSpouse === false) return taxPolicy.rothIraPhaseout.singleOrHeadOfHousehold;
  if (livedWithSpouse === true) return taxPolicy.rothIraPhaseout.marriedFilingSeparately;
  return null;
}
function reducedRothLimit(maxContribution: number, modifiedAgi: number, range: { start: number; end: number }): { limit: number; status: RetirementTaxStatus } {
  if (modifiedAgi < range.start) return { limit: maxContribution, status: "full" };
  if (modifiedAgi >= range.end) return { limit: 0, status: "none" };
  const fraction = Math.min(1, Math.max(0, (modifiedAgi - range.start) / (range.end - range.start)));
  let limit = Math.ceil((maxContribution * (1 - fraction)) / 10) * 10;
  if (limit > 0 && limit < 200) limit = 200;
  return { limit: roundMoney(Math.min(maxContribution, limit)), status: "partial" };
}
function traditionalDeductibility(snapshot: MoneyPrioritySnapshot, ownerPersonId: string, filingStatus: FilingStatus, modifiedAgi: number, livedWithSpouse: boolean | null, taxPolicy: MoneyPriorityTaxPolicy): { status: RetirementTaxStatus; reason: string; missingData: string[] } {
  const owner = snapshot.people.find((item) => item.id === ownerPersonId);
  if (!owner || owner.coveredByWorkplaceRetirementPlan === null) return { status: "unknown", reason: "", missingData: ["Workplace-retirement-plan coverage is required for the IRA owner."] };
  let range: { start: number; end: number } | null = null;
  if (owner.coveredByWorkplaceRetirementPlan) {
    if (filingStatus === "single" || filingStatus === "head_of_household") range = taxPolicy.traditionalIraDeductionPhaseout.coveredSingleOrHeadOfHousehold;
    else if (filingStatus === "married_filing_jointly") range = taxPolicy.traditionalIraDeductionPhaseout.coveredMarriedFilingJointly;
    else if (livedWithSpouse === true) range = taxPolicy.traditionalIraDeductionPhaseout.coveredMarriedFilingSeparately;
    else if (livedWithSpouse === false) range = taxPolicy.traditionalIraDeductionPhaseout.coveredSingleOrHeadOfHousehold;
    else return { status: "unknown", reason: "", missingData: ["Married-filing-separately deductibility requires spouse-living context."] };
  } else if (filingStatus === "married_filing_jointly") {
    const spouse = snapshot.people.find((item) => item.isActive && item.relationship === "spouse_partner" && item.id !== ownerPersonId);
    if (!spouse || spouse.coveredByWorkplaceRetirementPlan === null) return { status: "unknown", reason: "", missingData: ["Spouse workplace-retirement-plan coverage is required for Traditional IRA deductibility guidance."] };
    if (!spouse.coveredByWorkplaceRetirementPlan) return { status: "full", reason: "Neither spouse is marked as covered by a workplace retirement plan.", missingData: [] };
    range = taxPolicy.traditionalIraDeductionPhaseout.contributorNotCoveredSpouseCoveredMarriedFilingJointly;
  } else if (filingStatus === "single" || filingStatus === "head_of_household") return { status: "full", reason: "The IRA owner is not marked as covered by a workplace retirement plan.", missingData: [] };
  else return { status: "unknown", reason: "", missingData: ["Married-filing-separately deductibility is not determined safely from the current spouse coverage profile."] };
  if (modifiedAgi < range.start) return { status: "full", reason: "Estimated modified AGI is below the applicable Traditional IRA deduction phaseout.", missingData: [] };
  if (modifiedAgi >= range.end) return { status: "none", reason: "Estimated modified AGI is at or above the applicable Traditional IRA deduction phaseout ceiling.", missingData: [] };
  return { status: "partial", reason: "Estimated modified AGI falls inside the applicable Traditional IRA deduction phaseout range.", missingData: [] };
}

export function evaluateRetirementAccountOpportunities(snapshot: MoneyPrioritySnapshot, taxPolicy: MoneyPriorityTaxPolicy = MONEY_PRIORITY_TAX_POLICY_2026): RetirementAccountOpportunityResult {
  const opportunities: RetirementAccountOpportunity[] = [];
  const warnings: string[] = [];
  const sharedWorkplaceTypes = new Set(["401k", "403b", "tsp"]);
  const workplaceYtdByOwner = new Map<string, number | null>();
  const workplaceAccountCountByOwner = new Map<string, number>();
  const workplaceOwnerHas403b = new Set<string>();
  for (const account of snapshot.retirementAccounts.filter((item) => sharedWorkplaceTypes.has(item.type))) {
    if (!account.ownerPersonId) continue;
    const existing = workplaceYtdByOwner.get(account.ownerPersonId);
    workplaceYtdByOwner.set(account.ownerPersonId, existing === null || account.employeeContributedYtd === null ? null : roundMoney((existing ?? 0) + account.employeeContributedYtd));
    workplaceAccountCountByOwner.set(account.ownerPersonId, (workplaceAccountCountByOwner.get(account.ownerPersonId) ?? 0) + 1);
    if (account.type === "403b") workplaceOwnerHas403b.add(account.ownerPersonId);
  }
  const coordinatedDeferralYtdByOwner = new Map(workplaceYtdByOwner);
  const simpleYtdByOwner = new Map<string, number | null>();
  for (const account of snapshot.retirementAccounts.filter((item) => item.type === "simple_ira")) {
    if (!account.ownerPersonId) continue;
    const simpleExisting = simpleYtdByOwner.get(account.ownerPersonId);
    simpleYtdByOwner.set(account.ownerPersonId, simpleExisting === null || account.employeeContributedYtd === null ? null : roundMoney((simpleExisting ?? 0) + account.employeeContributedYtd));
    const coordinatedExisting = coordinatedDeferralYtdByOwner.get(account.ownerPersonId);
    coordinatedDeferralYtdByOwner.set(account.ownerPersonId, coordinatedExisting === null || account.employeeContributedYtd === null ? null : roundMoney((coordinatedExisting ?? 0) + account.employeeContributedYtd));
  }

  const hsaCapacity = evaluateHsaLegalCapacity(snapshot, taxPolicy);
  warnings.push(...hsaCapacity.warnings);

  const iraAccounts = snapshot.retirementAccounts.filter((item) => item.type === "traditional_ira" || item.type === "roth_ira");
  const iraYtdByOwner = new Map<string, number | null>();
  const rothYtdByOwner = new Map<string, number | null>();
  for (const account of iraAccounts) {
    if (!account.ownerPersonId) continue;
    const existing = iraYtdByOwner.get(account.ownerPersonId);
    iraYtdByOwner.set(account.ownerPersonId, existing === null || account.employeeContributedYtd === null ? null : roundMoney((existing ?? 0) + account.employeeContributedYtd));
    if (account.type === "roth_ira") {
      const existingRoth = rothYtdByOwner.get(account.ownerPersonId);
      rothYtdByOwner.set(account.ownerPersonId, existingRoth === null || account.employeeContributedYtd === null ? null : roundMoney((existingRoth ?? 0) + account.employeeContributedYtd));
    }
  }
  const profile = taxProfile(snapshot, taxPolicy);
  const iraCompensationLimitByOwner = new Map<string, number>();
  const iraOwners = [...new Set(iraAccounts.map((item) => item.ownerPersonId).filter((id): id is string => Boolean(id)))].sort();
  if (profile.filingStatus === "married_filing_jointly") {
    const marriedPair = snapshot.people.filter((person) => person.isActive && !person.isDependent && (person.relationship === "self" || person.relationship === "spouse_partner"));
    let householdCompensation = roundMoney(marriedPair.reduce((sum, person) => sum + (person.estimatedTaxableCompensationAnnual ?? 0), 0));
    for (const ownerId of iraOwners) {
      const owner = snapshot.people.find((person) => person.id === ownerId);
      if (!owner || !marriedPair.some((person) => person.id === ownerId)) { iraCompensationLimitByOwner.set(ownerId, owner?.estimatedTaxableCompensationAnnual ?? 0); continue; }
      const limit = iraStatutoryLimit(ageAtYearEnd(snapshot, ownerId, taxPolicy.taxYear), taxPolicy);
      const allocated = Math.min(limit, householdCompensation);
      iraCompensationLimitByOwner.set(ownerId, allocated);
      householdCompensation = roundMoney(Math.max(0, householdCompensation - allocated));
    }
  } else for (const ownerId of iraOwners) iraCompensationLimitByOwner.set(ownerId, snapshot.people.find((item) => item.id === ownerId)?.estimatedTaxableCompensationAnnual ?? 0);

  for (const account of snapshot.retirementAccounts) {
    const age = ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear);
    const owner = account.ownerPersonId ? snapshot.people.find((item) => item.id === account.ownerPersonId) : undefined;
    const missingOwner = !account.ownerPersonId;
    if (account.type === "hsa") {
      const hsa = hsaCapacity.byAccountId.get(account.id);
      if (!hsa) {
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: "more_information_needed", annualLimit: null, contributedYtd: null, remainingAnnualRoom: null, taxEligibility: "unknown", taxDeductibility: "not_applicable", reasons: [], missingData: ["Canonical HSA legal-capacity evaluation did not produce an account result."], sharedCapacityGroup: null });
        continue;
      }
      opportunities.push({
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        ownerPersonId: account.ownerPersonId,
        state: hsa.state,
        annualLimit: hsa.annualLimit,
        contributedYtd: hsa.contributedYtd,
        remainingAnnualRoom: hsa.remainingAnnualRoom,
        taxEligibility: hsa.state === "more_information_needed" ? "unknown" : hsa.state === "not_eligible" ? "none" : "full",
        taxDeductibility: "not_applicable",
        reasons: hsa.reasons,
        missingData: hsa.missingData,
        catchUpEligible: hsa.catchUpEligible,
        catchUpAmount: hsa.catchUpAmount,
        catchUpMustBeRoth: false,
        sharedCapacityGroup: hsa.sharedCapacityGroup,
        sharedCapacityRemainingRoom: hsa.sharedCapacityRemainingRoom,
        ownerCatchUpRemainingRoom: null,
        hsaCatchUpAttributionVerified: hsa.state !== "more_information_needed",
        hsaCapacityBasis: hsa.capacityBasis,
      });
      continue;
    }
    if (sharedWorkplaceTypes.has(account.type) || account.type === "457b" || account.type === "simple_ira") {
      const missingData: string[] = [];
      if (missingOwner) missingData.push("Account owner is required to evaluate catch-up eligibility and shared deferral limits.");
      const contributedYtd = account.type === "457b" ? account.employeeContributedYtd : account.type === "simple_ira" ? account.ownerPersonId ? (simpleYtdByOwner.get(account.ownerPersonId) ?? null) : null : account.ownerPersonId ? (workplaceYtdByOwner.get(account.ownerPersonId) ?? null) : null;
      if (contributedYtd === null) missingData.push("Employee contributions YTD are required to calculate remaining elective-deferral room.");
      const compensation = sharedWorkplaceTypes.has(account.type) ? account.planEligibleCompensationAnnual ?? null : owner?.estimatedTaxableCompensationAnnual ?? null;
      if (sharedWorkplaceTypes.has(account.type) && compensation === null) missingData.push("Current-year compensation attributable to this specific plan and sponsoring employer is required to apply the 100%-of-compensation annual-additions ceiling.");
      if (!sharedWorkplaceTypes.has(account.type) && compensation === null) missingData.push("Participant compensation is required to calculate the applicable employee contribution ceiling.");
      if (sharedWorkplaceTypes.has(account.type) && account.employerContributedYtd === null) missingData.push("Employer contributions YTD are required to apply the defined-contribution annual-additions limit.");
      if (sharedWorkplaceTypes.has(account.type) && account.ownerPersonId && (workplaceAccountCountByOwner.get(account.ownerPersonId) ?? 0) > 1) missingData.push("Employer/plan identity is required to allocate annual-additions capacity precisely across multiple workplace accounts; each account's plan-specific compensation remains separate and no separate plan limit is inferred.");
      if (account.type === "simple_ira" && account.simpleHigherLimitEligible == null) missingData.push("Whether this SIMPLE plan qualifies for the higher applicable-plan limit is unknown; the standard limit is used.");
      const catchUp = catchUpAmount(age, account.type, taxPolicy);
      let catchUpMustBeRoth: boolean | null = false;
      if (catchUp > 0 && (sharedWorkplaceTypes.has(account.type) || account.type === "457b")) {
        if (account.priorYearSponsorWages == null) { catchUpMustBeRoth = null; missingData.push("Prior-year wages from this plan's sponsoring employer are required to determine Roth catch-up treatment."); }
        else if (account.priorYearSponsorWages > taxPolicy.highWageRothCatchUpThreshold) { catchUpMustBeRoth = true; if (account.rothCatchUpSupported == null) missingData.push("Plan Roth catch-up support is required for this high-wage participant."); if (account.rothCatchUpSupported === false) missingData.push("This plan cannot support the Roth catch-up required for this high-wage participant."); }
      }
      const statutoryLimit = account.type === "simple_ira" ? simpleLimit(age, account.simpleHigherLimitEligible === true, taxPolicy) : workplaceLimit(age, taxPolicy);
      const rothSupportedLimit = catchUpMustBeRoth === true && account.rothCatchUpSupported !== true ? statutoryLimit - catchUp : statutoryLimit;
      const annualLimit = compensation === null ? rothSupportedLimit : roundMoney(Math.min(rothSupportedLimit, compensation));
      let remainingAnnualRoom = contributedYtd === null ? null : roundMoney(Math.max(0, annualLimit - contributedYtd));
      if (account.type !== "457b" && account.ownerPersonId) { const coordinatedYtd = coordinatedDeferralYtdByOwner.get(account.ownerPersonId); if (remainingAnnualRoom !== null && coordinatedYtd !== null && coordinatedYtd !== undefined) remainingAnnualRoom = Math.min(remainingAnnualRoom, roundMoney(Math.max(0, workplaceLimit(age, taxPolicy) - coordinatedYtd))); }
      let annualAdditionsLimit: number | null = null;
      let annualAdditionsYtd: number | null = null;
      if (sharedWorkplaceTypes.has(account.type)) {
        const employeeYtd = account.employeeContributedYtd;
        const employerYtd = account.employerContributedYtd;
        annualAdditionsLimit = compensation === null ? null : roundMoney(Math.min(taxPolicy.definedContributionAnnualAdditionsLimit, compensation));
        if (employeeYtd !== null && employerYtd !== null) {
          const has403bAmbiguity = account.ownerPersonId !== null && workplaceOwnerHas403b.has(account.ownerPersonId);
          const ageCatchUpUsed = has403bAmbiguity ? 0 : Math.min(catchUp, Math.max(0, employeeYtd - taxPolicy.workplaceEmployeeDeferralLimit));
          if (has403bAmbiguity && employeeYtd > taxPolicy.workplaceEmployeeDeferralLimit && catchUp > 0) missingData.push("403(b) deferrals above the basic limit require plan records to distinguish the unsupported 15-year catch-up from age-based catch-up for annual-additions treatment.");
          annualAdditionsYtd = roundMoney(employeeYtd + employerYtd - ageCatchUpUsed);
          if (annualAdditionsLimit !== null && remainingAnnualRoom !== null) {
            const unusedAgeCatchUp = Math.max(0, catchUp - ageCatchUpUsed);
            const additionsRoomIncludingExcludedCatchUp = roundMoney(Math.max(0, annualAdditionsLimit - annualAdditionsYtd) + unusedAgeCatchUp);
            remainingAnnualRoom = Math.min(remainingAnnualRoom, additionsRoomIncludingExcludedCatchUp);
          }
        }
      }
      const reasons = [account.type === "457b" ? "Governmental 457(b) elective-deferral room is evaluated separately from the shared 401(k)/403(b)/TSP grouping in this model. The special last-three-years catch-up is not granted because plan normal-retirement-age and unused prior-year deferral data are not modeled." : account.type === "simple_ira" ? "SIMPLE salary reductions use the SIMPLE plan limit and coordinate with the overall elective-deferral limit." : "401(k), 403(b), and TSP employee deferrals are aggregated by owner; employee and employer additions are also capped by the lesser of the 2026 annual-additions dollar limit or supported compensation, while eligible age-based catch-up is excluded from that annual-additions calculation."];
      if (account.type === "403b") reasons.push("The special 403(b) 15-years-of-service catch-up is not modeled or automatically granted; employer service, plan permission, prior deferrals, and prior special-catch-up usage are required.");
      const state = missingData.length ? "more_information_needed" : (remainingAnnualRoom ?? 0) > 0 ? "available" : "limit_reached";
      opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state, annualLimit, contributedYtd: contributedYtd === null ? null : roundMoney(contributedYtd), remainingAnnualRoom, taxEligibility: missingData.length ? "unknown" : "full", taxDeductibility: "not_applicable", reasons, missingData: [...new Set(missingData)], catchUpEligible: catchUp > 0, catchUpAmount: catchUp, catchUpMustBeRoth, annualAdditionsLimit, annualAdditionsYtd, compensationLimitApplied: compensation });
      continue;
    }
    if (account.type === "sep_ira") {
      const missingData: string[] = [];
      if (missingOwner) missingData.push("SEP owner is required to evaluate employer contribution capacity.");
      if (account.sepCompensationCalculationSupported !== true || account.sepEligibleCompensationAnnual == null) missingData.push("SEP eligible compensation from a supported employer calculation is required; self-employed compensation is not inferred.");
      if (account.employerContributedYtd === null) missingData.push("SEP employer contributions YTD are required.");
      if (missingData.length) { opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: "more_information_needed", annualLimit: null, contributedYtd: account.employerContributedYtd, remainingAnnualRoom: null, taxEligibility: "unknown", taxDeductibility: "not_applicable", reasons: ["Ordinary SEP IRAs are employer-funded and have no employee elective deferral or catch-up."], missingData, contributionSource: "employer", catchUpEligible: false, catchUpAmount: 0, catchUpMustBeRoth: false }); continue; }
      const annualLimit = roundMoney(Math.min(taxPolicy.sepEmployerContributionLimit, account.sepEligibleCompensationAnnual! * taxPolicy.sepEmployerCompensationRate));
      const contributedYtd = roundMoney(account.employerContributedYtd!);
      const remainingAnnualRoom = roundMoney(Math.max(0, annualLimit - contributedYtd));
      opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: remainingAnnualRoom > 0 ? "available" : "limit_reached", annualLimit, contributedYtd, remainingAnnualRoom, taxEligibility: "full", taxDeductibility: "not_applicable", reasons: ["Ordinary SEP capacity is employer-only and capped at the lesser of 25% of supported eligible compensation or the annual limit."], missingData: [], contributionSource: "employer", catchUpEligible: false, catchUpAmount: 0, catchUpMustBeRoth: false });
      continue;
    }
    if (account.type === "roth_ira" || account.type === "traditional_ira") {
      const missingData = [...profile.missingData];
      if (missingOwner) missingData.push("IRA owner is required to evaluate the age-based IRA limit.");
      if (!owner || owner.estimatedTaxableCompensationAnnual === null) missingData.push("Estimated taxable compensation is required for the IRA owner.");
      const totalIraYtd = account.ownerPersonId ? (iraYtdByOwner.get(account.ownerPersonId) ?? null) : null;
      if (totalIraYtd === null) missingData.push("Traditional and Roth IRA contributions YTD are required because they share one annual IRA limit.");
      const statutoryLimit = missingOwner ? null : iraStatutoryLimit(age, taxPolicy);
      const compensationLimit = account.ownerPersonId ? (iraCompensationLimitByOwner.get(account.ownerPersonId) ?? null) : null;
      if (owner?.estimatedTaxableCompensationAnnual === 0 && profile.filingStatus !== "married_filing_jointly") missingData.push("A non-earning IRA owner requires married-filing-jointly spousal-IRA treatment or individual compensation.");
      const maxContribution = statutoryLimit === null || compensationLimit === null ? null : Math.min(statutoryLimit, compensationLimit);
      const combinedRemaining = maxContribution === null || totalIraYtd === null ? null : roundMoney(Math.max(0, maxContribution - totalIraYtd));
      if (account.type === "roth_ira") {
        const range = profile.filingStatus ? rothPhaseoutRange(profile.filingStatus, profile.livedWithSpouse, taxPolicy) : null;
        if (profile.filingStatus === "married_filing_separately" && range === null && !missingData.some((item) => item.includes("spouses lived together"))) missingData.push("Married-filing-separately Roth eligibility requires spouse-living context.");
        if (missingData.length || maxContribution === null || profile.modifiedAgi === null || range === null) { opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: "more_information_needed", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining, taxEligibility: "unknown", taxDeductibility: "not_applicable", reasons: ["Traditional and Roth IRAs share one annual contribution limit per person."], missingData: [...new Set(missingData)] }); continue; }
        const direct = reducedRothLimit(maxContribution, profile.modifiedAgi, range);
        const rothYtd = rothYtdByOwner.get(account.ownerPersonId!) ?? 0;
        const remainingAnnualRoom = roundMoney(Math.min(Math.max(0, direct.limit - rothYtd), combinedRemaining ?? 0));
        opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: direct.status === "none" ? "not_eligible" : remainingAnnualRoom > 0 ? "available" : "limit_reached", annualLimit: direct.limit, contributedYtd: roundMoney(rothYtd), remainingAnnualRoom, taxEligibility: direct.status, taxDeductibility: "not_applicable", reasons: [direct.status === "full" ? "Estimated modified AGI is below the direct Roth IRA phaseout range." : direct.status === "partial" ? "Estimated modified AGI falls inside the direct Roth IRA phaseout range, so the IRS reduced-limit worksheet applies." : "Estimated modified AGI is at or above the direct Roth IRA phaseout ceiling.", "Traditional and Roth IRAs share one annual contribution limit per person."], missingData: [] });
        continue;
      }
      if (missingData.length || maxContribution === null || totalIraYtd === null || !profile.filingStatus || profile.modifiedAgi === null || !account.ownerPersonId) { opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: "more_information_needed", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining, taxEligibility: maxContribution !== null && maxContribution > 0 ? "full" : "unknown", taxDeductibility: "unknown", reasons: ["Traditional IRA contribution eligibility and tax deductibility are separate decisions."], missingData: [...new Set(missingData)] }); continue; }
      const deduction = traditionalDeductibility(snapshot, account.ownerPersonId, profile.filingStatus, profile.modifiedAgi, profile.livedWithSpouse, taxPolicy);
      if (deduction.missingData.length) { opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: "more_information_needed", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining, taxEligibility: "full", taxDeductibility: "unknown", reasons: ["Traditional IRA contributions may still be allowed even when the deduction is limited."], missingData: deduction.missingData }); continue; }
      opportunities.push({ accountId: account.id, accountName: account.name, accountType: account.type, ownerPersonId: account.ownerPersonId, state: (combinedRemaining ?? 0) > 0 ? "available" : "limit_reached", annualLimit: maxContribution, contributedYtd: totalIraYtd, remainingAnnualRoom: combinedRemaining, taxEligibility: "full", taxDeductibility: deduction.status, reasons: ["Traditional and Roth IRAs share one annual contribution limit per person.", deduction.reason], missingData: [] });
      continue;
    }
    warnings.push(`${account.name}: account-specific annual-limit guidance is not implemented for ${account.type}.`);
  }

  const householdHasPretax = snapshot.retirementAccounts.some((account) => account.balance > 0 && (account.taxTreatment === "traditional" || account.taxTreatment === "pre_tax"));
  const householdHasRoth = snapshot.retirementAccounts.some((account) => account.balance > 0 && account.taxTreatment === "roth");
  for (const opportunity of opportunities) {
    const account = snapshot.retirementAccounts.find((item) => item.id === opportunity.accountId)!;
    opportunity.contributionSource ??= "employee";
    opportunity.catchUpEligible ??= account.type === "hsa" ? ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear) !== null && ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear)! >= 55 : catchUpAmount(ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear), account.type, taxPolicy) > 0;
    opportunity.catchUpAmount ??= account.type === "hsa" && opportunity.catchUpEligible ? taxPolicy.hsaCatchUpAge55 : catchUpAmount(ageAtYearEnd(snapshot, account.ownerPersonId, taxPolicy.taxYear), account.type, taxPolicy);
    if (opportunity.catchUpMustBeRoth === undefined) opportunity.catchUpMustBeRoth = false;
    if (opportunity.sharedCapacityGroup === undefined) opportunity.sharedCapacityGroup = account.ownerPersonId ? account.type === "traditional_ira" || account.type === "roth_ira" ? `ira:${account.ownerPersonId}` : sharedWorkplaceTypes.has(account.type) || account.type === "simple_ira" ? `elective-deferral:${account.ownerPersonId}` : account.type === "hsa" ? `hsa:${account.ownerPersonId}` : null : null;
    opportunity.opportunityTier = qualityTier(account, opportunity.state, opportunity.taxEligibility, opportunity.taxDeductibility, householdHasPretax, householdHasRoth);
  }
  return { taxYear: taxPolicy.taxYear, taxPolicyVersion: taxPolicy.version, opportunities, warnings };
}
