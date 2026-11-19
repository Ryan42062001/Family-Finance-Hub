// FFH-P10 — wording only. Labels for the canonical states; it never computes or changes a verdict.
import type { HomeAffordabilityState, HomeFinancingQuality } from "../calculations/home-affordability.ts";
import type { VehicleAffordabilityState, VehicleFinancingQuality } from "../calculations/vehicle-affordability.ts";
import type { GuidelineStatus } from "./guidance.ts";

type State = HomeAffordabilityState | VehicleAffordabilityState;

export const VERDICT_LABEL: Record<State, string> = {
  comfortably_affordable: "Comfortably affordable",
  affordable: "Affordable",
  stretch: "A stretch",
  not_recommended: "Not recommended",
  more_information_needed: "More information needed",
};

export const VERDICT_SUMMARY: Record<State, string> = {
  comfortably_affordable: "Your plan can cover this and still fund its protected priorities with room to spare.",
  affordable: "Your plan can cover this while keeping its protected priorities funded, but it uses a meaningful share of your room.",
  stretch: "Possible, but it leaves a thin margin, adds financing risk or slows retirement saving.",
  not_recommended: "This would compromise something your plan protects, such as reserves, the employer match, required goals or monthly cash flow.",
  more_information_needed: "Some costs are unknown, so we can't give a verdict yet. Unknown costs are never treated as zero.",
};

export const FINANCING_LABEL: Record<HomeFinancingQuality | VehicleFinancingQuality, string> = {
  preferred: "Strong loan terms",
  acceptable: "Acceptable loan terms",
  caution: "Loan terms need caution",
  not_recommended: "Loan terms not recommended",
  not_applicable: "No loan needed",
  more_information_needed: "Loan details needed",
};

export const GUIDELINE_STATUS_LABEL: Record<GuidelineStatus, string> = {
  meets: "Within guideline",
  exceeds: "Outside guideline",
  insufficient_information: "Insufficient information",
  not_applicable: "Doesn't apply",
};

const HOME_MISSING: Array<[string, string]> = [
  ["downPayment must not exceed purchasePrice", "The down payment can't be more than the home price."],
  ["purchasePrice", "Home price"],
  ["downPayment", "Down payment"],
  ["mortgage.interestRate", "Interest rate"],
  ["mortgage.termYears", "Loan length in whole years"],
  ["mortgage.arm", "Adjustable-rate details (when the rate first changes, how often, and the rate caps)"],
  ["closing.closingCosts", "Closing costs (enter 0 if none)"],
  ["closing.prepaidCosts", "Prepaid costs such as prepaid interest and insurance (enter 0 if none)"],
  ["closing.initialEscrowDeposit", "Initial escrow deposit (enter 0 if none)"],
  ["closing.", "Closing credits or earnest money"],
  ["propertyTaxesAnnual", "Yearly property taxes"],
  ["insurance.homeownersAnnual", "Yearly homeowners insurance"],
  ["insurance.floodAnnual", "Yearly flood insurance (enter 0 if not required)"],
  ["insurance.otherRequiredAnnual", "Other required yearly insurance (enter 0 if none)"],
  ["hoaMonthly", "Monthly HOA dues (enter 0 if none)"],
  ["mortgageInsurance.monthlyAmount", "Monthly mortgage insurance amount"],
  ["monthlyMaintenancePlanningAmount", "Monthly maintenance set-aside"],
  ["monthlyUtilityChange", "Change in monthly utilities (enter 0 if about the same)"],
  ["otherMonthlyPropertyCosts", "Other monthly property costs (enter 0 if none)"],
  ["currentHousingMonthlyCost", "Your current monthly housing payment"],
  ["immediateRequiredRepairs", "Repairs needed right away"],
  ["relatedGoalId", "The savings goal chosen for this purchase"],
];

const VEHICLE_MISSING: Array<[string, string]> = [
  ["purchasePrice", "Vehicle price"],
  ["tradeInValue", "Trade-in value"],
  ["tradeInLoanPayoff", "Loan left on the trade-in"],
  ["cashDownPayment", "Cash you'll put down"],
  ["salesTax", "Sales tax (enter 0 if none)"],
  ["titleRegistrationFees", "Title and registration fees (enter 0 if none)"],
  ["otherPurchaseFees", "Other dealer or purchase fees (enter 0 if none)"],
  ["loanApr", "Loan APR"],
  ["loanTermMonths", "Loan length in months"],
  ["monthlyInsuranceChange", "Change in monthly insurance"],
  ["monthlyFuelChange", "Change in monthly fuel or charging"],
  ["monthlyMaintenanceChange", "Change in monthly maintenance"],
  ["monthlyRegistrationTaxChange", "Change in monthly registration and taxes (enter 0 if about the same)"],
  ["monthlyParkingTollsChange", "Change in monthly parking and tolls (enter 0 if about the same)"],
  ["relatedGoalId", "The savings goal chosen for this purchase"],
];

/** Maps canonical missing-data codes to plain wording. Unknown codes are kept (never dropped) in a generic form. */
export function describeMissing(kind: "home" | "vehicle", missingData: readonly string[]): string[] {
  const table = kind === "home" ? HOME_MISSING : VEHICLE_MISSING;
  const out = new Set<string>();
  for (const code of missingData) {
    const match = table.find(([prefix]) => code === prefix || code.startsWith(prefix));
    out.add(match ? match[1] : `Check this detail: ${code}`);
  }
  return [...out];
}
