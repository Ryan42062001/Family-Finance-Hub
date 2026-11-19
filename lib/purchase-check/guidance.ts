// FFH-P10 — Financial best-practice guidance (issue #171).
//
// Educational, NONBLOCKING rules of thumb shown BESIDE the canonical affordability verdict. Nothing here changes,
// upgrades or downgrades the verdict from lib/calculations/home-affordability.ts or vehicle-affordability.ts.
// Every figure is read from the canonical evaluator output and the authoritative engine snapshots; this module only
// compares those figures with a published threshold. Comparisons are done in whole cents so an exact boundary is
// decided exactly. Missing inputs are never treated as zero: the guideline reports "insufficient_information".
//
// Sources rechecked 2026-11-19 (see .ai/DECISIONS.md, FFH-P10 entry).
import type { MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import type { HomeAffordabilityResult, HomePurchaseScenario } from "../calculations/home-affordability.ts";
import type { VehicleAffordabilityResult, VehiclePurchaseScenario } from "../calculations/vehicle-affordability.ts";

export type GuidelineStatus = "meets" | "exceeds" | "insufficient_information" | "not_applicable";

export type GuidelineSourceKind = "lender_guideline" | "educator_recommendation" | "consumer_agency_guidance";

export type GuidelineSource = { kind: GuidelineSourceKind; label: string; url: string };

export type GuidelineId =
  | "housing_28"
  | "debt_36"
  | "vehicle_down_20"
  | "vehicle_term_36"
  | "vehicle_payments_8"
  | "vehicle_value_50"
  | "emergency_reserve";

export type GuidelineCheck = {
  id: GuidelineId;
  title: string;
  status: GuidelineStatus;
  /** Plain-language actual value, e.g. "31.25% of gross monthly income ($4,687.50 of $15,000.00)"; null if unknown. */
  actual: string | null;
  threshold: string;
  explanation: string;
  missing: string[];
  notes: string[];
  source: GuidelineSource;
};

export const GUIDELINE_SOURCES = {
  fannieMae2836: {
    kind: "lender_guideline",
    label: "Fannie Mae — Glossary of key terms (28/36 rule)",
    url: "https://yourhome.fanniemae.com/calculators-tools/glossary-key-terms",
  },
  moneyGuy2038: {
    kind: "educator_recommendation",
    label: "Money Guy — The 20/3/8 rule",
    url: "https://moneyguy.com/guide/20-3-8-rule/",
  },
  ramseyVehicles: {
    kind: "educator_recommendation",
    label: "Ramsey Solutions — How much car can I afford?",
    url: "https://www.ramseysolutions.com/saving/how-much-car-can-i-afford/",
  },
  cfpbEmergency: {
    kind: "consumer_agency_guidance",
    label: "Consumer Financial Protection Bureau — Determine your down payment",
    url: "https://www.consumerfinance.gov/owning-a-home/prepare/determine-your-down-payment/",
  },
} as const satisfies Record<string, GuidelineSource>;

export const GUIDELINE_DISCLAIMER =
  "These are general rules of thumb from a mortgage company, a consumer agency and financial educators. They are not "
  + "laws or lending requirements, and lenders often approve higher ratios. They never change your affordability result above.";

// ---- exact-cent helpers ------------------------------------------------------------------------------------------

/** Converts an engine dollar amount to whole cents (engine amounts are already rounded to cents). */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

/** Percentage with two decimals, truncated toward the threshold side is avoided: status is decided in cents, not here. */
function percent(numeratorCents: number, denominatorCents: number): string {
  return `${((numeratorCents / denominatorCents) * 100).toFixed(2)}%`;
}

/** true when numerator <= pct% of denominator, exactly (pct is a whole number). */
function atOrBelowPercent(numeratorCents: number, denominatorCents: number, pct: number): boolean {
  return numeratorCents * 100 <= pct * denominatorCents;
}

type GrossIncome = { monthlyCents: number } | { missing: string };

function grossIncome(engine: MoneyPriorityEngineResult): GrossIncome {
  const aggregates = engine.snapshot.aggregates;
  if (aggregates.hasIncompleteGrossIncome) {
    return { missing: "Gross (before-tax) income for every active income source in your Financial profile" };
  }
  const monthlyCents = toCents(aggregates.monthlyGrossIncomeKnown);
  if (!(monthlyCents > 0)) return { missing: "Gross (before-tax) income in your Financial profile" };
  return { monthlyCents };
}

function insufficient(
  base: Omit<GuidelineCheck, "status" | "actual" | "missing" | "notes" | "explanation">,
  missing: string[],
  explanation: string,
  notes: string[] = [],
): GuidelineCheck {
  return { ...base, status: "insufficient_information", actual: null, missing, notes, explanation };
}

// ---- Home ---------------------------------------------------------------------------------------------------------

const HOUSING_PAYMENT_INPUTS: Array<[string, string]> = [
  ["purchasePrice", "Purchase price"],
  ["downPayment", "Down payment"],
  ["mortgage.", "Loan rate, term and type"],
  ["propertyTaxesAnnual", "Yearly property taxes"],
  ["insurance.", "Yearly homeowners, flood and other required insurance"],
  ["hoaMonthly", "Monthly HOA or association dues"],
  ["mortgageInsurance.", "Monthly mortgage insurance"],
];

function missingFor(missingData: readonly string[], inputs: Array<[string, string]>): string[] {
  const labels = new Set<string>();
  for (const item of missingData) {
    for (const [prefix, label] of inputs) if (item === prefix || item.startsWith(prefix)) labels.add(label);
  }
  return [...labels];
}

export type HomeGuidanceInput = {
  baseline: MoneyPriorityEngineResult;
  postEngine: MoneyPriorityEngineResult | null;
  scenario: HomePurchaseScenario;
  result: HomeAffordabilityResult;
};

export function homeGuidance({ baseline, postEngine, scenario, result }: HomeGuidanceInput): GuidelineCheck[] {
  const missingPayment = missingFor(result.missingData, HOUSING_PAYMENT_INPUTS);
  // Lender-style housing payment: principal and interest + taxes + insurance + HOA + mortgage insurance.
  // Maintenance, utilities and other ownership costs are deliberately excluded here (they are in the canonical
  // all-in cost above), matching the traditional definition.
  const housingCents = toCents(result.monthly.principalAndInterest) + toCents(result.monthly.taxesInsuranceHoaAndMortgageInsurance);
  const gross = grossIncome(baseline);
  const housingNotes = [
    "Counts principal and interest, property taxes, insurance, HOA dues and mortgage insurance. Maintenance, utilities and other ownership costs are not part of this ratio, but they are included in your affordability result.",
  ];
  if (scenario.mortgage.rateType === "adjustable" && result.mortgage.stressedPrincipalAndInterest !== null && "monthlyCents" in gross) {
    const stressed = toCents(result.mortgage.stressedPrincipalAndInterest) + toCents(result.monthly.taxesInsuranceHoaAndMortgageInsurance);
    housingNotes.push(`Uses the starting payment. At the loan's highest possible rate the payment would be ${money(stressed)} (${percent(stressed, gross.monthlyCents)} of gross income).`);
  }

  const housingBase = {
    id: "housing_28" as const,
    title: "Housing payment: 28% of gross income",
    threshold: "28% or less of gross monthly household income",
    source: GUIDELINE_SOURCES.fannieMae2836,
  };
  const debtBase = {
    id: "debt_36" as const,
    title: "All debt payments: 36% of gross income",
    threshold: "36% or less of gross monthly household income",
    source: GUIDELINE_SOURCES.fannieMae2836,
  };
  const checks: GuidelineCheck[] = [];

  const incomeMissing = "missing" in gross ? [gross.missing] : [];
  if (missingPayment.length || incomeMissing.length) {
    checks.push(insufficient(housingBase, [...missingPayment, ...incomeMissing],
      "We can't compare the housing payment with income until these are filled in. Unknown amounts are never counted as zero.", housingNotes));
    checks.push(insufficient(debtBase, [...missingPayment, ...incomeMissing],
      "We can't compare total debt payments with income until these are filled in.", []));
  } else {
    const grossCents = (gross as { monthlyCents: number }).monthlyCents;
    const housingOk = atOrBelowPercent(housingCents, grossCents, 28);
    checks.push({
      ...housingBase,
      status: housingOk ? "meets" : "exceeds",
      actual: `${percent(housingCents, grossCents)} of gross monthly income (${money(housingCents)} of ${money(grossCents)})`,
      explanation: housingOk
        ? "The projected housing payment is within the traditional 28% guideline. This alone does not mean the home is affordable; see the result above."
        : "The projected housing payment is above the traditional 28% guideline. Lenders may still approve it, but it leaves less room for everything else.",
      missing: [],
      notes: housingNotes,
    });

    const otherDebtCents = toCents(baseline.snapshot.aggregates.monthlyMinimumDebtPayments);
    const totalCents = housingCents + otherDebtCents;
    const debtOk = atOrBelowPercent(totalCents, grossCents, 36);
    const debtNotes = [`Adds your recorded minimum debt payments (${money(otherDebtCents)}/month) to the new housing payment.`];
    const existingMortgages = baseline.snapshot.debts.filter((debt) => debt.type === "mortgage");
    if (existingMortgages.length && (scenario.currentHousingCostDisappears || scenario.homeSale)) {
      const mortgageCents = existingMortgages.reduce((sum, debt) => sum + toCents(debt.minimumPayment), 0);
      debtNotes.push(`Includes your current mortgage payment (${money(mortgageCents)}/month). If this purchase pays that mortgage off, the real ratio would be lower.`);
    }
    checks.push({
      ...debtBase,
      status: debtOk ? "meets" : "exceeds",
      actual: `${percent(totalCents, grossCents)} of gross monthly income (${money(totalCents)} of ${money(grossCents)})`,
      explanation: debtOk
        ? "Housing plus your other debt payments are within the traditional 36% guideline."
        : "Housing plus your other debt payments are above the traditional 36% guideline, which leaves less room for saving and surprises.",
      missing: [],
      notes: debtNotes,
    });
  }

  checks.push(emergencyReserveCheck(baseline, postEngine, toCents(result.cashToClose.protectedCashRequired), toCents(result.cashToClose.postClosingAvailableLiquidity)));
  return checks;
}

// ---- Vehicle ------------------------------------------------------------------------------------------------------

export type VehicleGuidanceInput = {
  baseline: MoneyPriorityEngineResult;
  postEngine: MoneyPriorityEngineResult | null;
  scenario: VehiclePurchaseScenario;
  result: VehicleAffordabilityResult;
  /** Current value of every other vehicle the household will still own; null = not provided (never guessed). */
  otherVehiclesValue: number | null;
};

export function vehicleGuidance({ baseline, postEngine, scenario, result, otherVehiclesValue }: VehicleGuidanceInput): GuidelineCheck[] {
  const checks: GuidelineCheck[] = [];
  const priceCents = toCents(scenario.purchasePrice);
  const financedCents = toCents(result.acquisition.amountFinanced);
  const missingData = result.missingData;
  const priceKnown = Number.isFinite(scenario.purchasePrice) && priceCents > 0 && !missingData.some((item) => item.startsWith("purchasePrice"));
  const financed = financedCents > 0;
  const loanTermsMissing = missingData.includes("loanApr") || missingData.includes("loanTermMonths");
  const acquisitionMissing = missingFor(missingData, [
    ["salesTax", "Sales tax"], ["titleRegistrationFees", "Title and registration fees"], ["otherPurchaseFees", "Other purchase fees"],
    ["tradeInValue", "Trade-in value"], ["tradeInLoanPayoff", "Trade-in loan payoff"], ["cashDownPayment", "Cash down payment"],
  ]);

  // 20% down
  const downBase = { id: "vehicle_down_20" as const, title: "20/3/8: at least 20% down", threshold: "Cash down plus trade-in equity of at least 20% of the price", source: GUIDELINE_SOURCES.moneyGuy2038 };
  if (!priceKnown || acquisitionMissing.length) {
    checks.push(insufficient(downBase, priceKnown ? acquisitionMissing : ["Purchase price", ...acquisitionMissing],
      "We need the full purchase details to know how much you would finance."));
  } else if (!financed) {
    checks.push({ ...downBase, status: "meets", actual: "Paid in full, no loan", explanation: "Paying the whole price without a loan meets this part of the rule.", missing: [], notes: [] });
  } else {
    const downCents = toCents(scenario.cashDownPayment) + toCents(result.acquisition.tradeEquity);
    const ok = downCents * 100 >= 20 * priceCents;
    checks.push({
      ...downBase,
      status: ok ? "meets" : "exceeds",
      actual: `${percent(Math.max(0, downCents), priceCents)} down (${money(Math.max(0, downCents))} of ${money(priceCents)})`,
      explanation: ok
        ? "Your cash down plus trade-in equity is at least 20% of the price."
        : "Less than 20% down makes it more likely you'll owe more than the car is worth as it loses value.",
      missing: [],
      notes: result.acquisition.negativeEquityRolledIn > 0 ? [`The trade-in is worth less than its loan, so ${money(toCents(result.acquisition.negativeEquityRolledIn))} is added to the new loan.`] : [],
    });
  }

  // 3 years
  const termBase = { id: "vehicle_term_36" as const, title: "20/3/8: finance for 3 years or less", threshold: "Loan term of 36 months or fewer", source: GUIDELINE_SOURCES.moneyGuy2038 };
  if (!priceKnown || acquisitionMissing.length) {
    checks.push(insufficient(termBase, priceKnown ? acquisitionMissing : ["Purchase price", ...acquisitionMissing], "We need the full purchase details to know whether a loan is needed."));
  } else if (!financed) {
    checks.push({ ...termBase, status: "not_applicable", actual: "No loan", explanation: "No loan, so the loan-length part does not apply.", missing: [], notes: [] });
  } else if (missingData.includes("loanTermMonths")) {
    checks.push(insufficient(termBase, ["Loan length in months"], "Add the loan length to compare it with the guideline."));
  } else {
    const months = scenario.loanTermMonths as number;
    const ok = months <= 36;
    checks.push({
      ...termBase,
      status: ok ? "meets" : "exceeds",
      actual: `${months} months`,
      explanation: ok ? "The loan is paid off within three years." : "Longer loans lower the payment but add interest and time spent owing more than the car is worth.",
      missing: [], notes: [],
    });
  }

  // 8% of gross income, all vehicle payments combined
  const paymentBase = { id: "vehicle_payments_8" as const, title: "20/3/8: all car payments under 8% of gross income", threshold: "All vehicle loan payments combined at 8% or less of gross monthly household income", source: GUIDELINE_SOURCES.moneyGuy2038 };
  const gross = grossIncome(baseline);
  const autoDebts = baseline.snapshot.debts.filter((debt) => debt.type === "auto");
  const paymentMissing: string[] = [];
  if (!priceKnown) paymentMissing.push("Purchase price");
  paymentMissing.push(...acquisitionMissing);
  if (financed && loanTermsMissing) paymentMissing.push("Loan rate (APR) and length");
  if ("missing" in gross) paymentMissing.push(gross.missing);
  const tradePayoffAmbiguous = toCents(scenario.tradeInLoanPayoff) > 0 && autoDebts.length > 0;
  if (tradePayoffAmbiguous) {
    paymentMissing.push("Which recorded vehicle loan the trade-in payoff closes (we can't tell, so we don't guess)");
  }
  if (paymentMissing.length) {
    checks.push(insufficient(paymentBase, paymentMissing, "We can't total your car payments against income until this is known."));
  } else {
    const grossCents = (gross as { monthlyCents: number }).monthlyCents;
    const newCents = toCents(result.acquisition.monthlyPayment);
    const existingCents = autoDebts.reduce((sum, debt) => sum + toCents(debt.minimumPayment), 0);
    const totalCents = newCents + existingCents;
    const ok = atOrBelowPercent(totalCents, grossCents, 8);
    checks.push({
      ...paymentBase,
      status: ok ? "meets" : "exceeds",
      actual: `${percent(totalCents, grossCents)} of gross monthly income (${money(totalCents)} of ${money(grossCents)})`,
      explanation: ok
        ? "Your combined car loan payments are within 8% of gross income."
        : "Your combined car loan payments are above 8% of gross income, which can crowd out saving and investing.",
      missing: [],
      notes: [
        existingCents > 0
          ? `Includes your recorded vehicle loan payments (${money(existingCents)}/month) plus the new loan (${money(newCents)}/month).`
          : `New loan payment ${money(newCents)}/month; no other vehicle loans are recorded.`,
        "Loan payments only; insurance, fuel and upkeep are in your affordability result.",
      ],
    });
  }

  // Ramsey: total value of everything with a motor <= half of annual income
  const valueBase = { id: "vehicle_value_50" as const, title: "Total vehicle value under half of yearly income", threshold: "All vehicles together worth 50% or less of gross yearly household income", source: GUIDELINE_SOURCES.ramseyVehicles };
  const valueMissing: string[] = [];
  if (!priceKnown) valueMissing.push("Purchase price");
  if (otherVehiclesValue === null || !Number.isFinite(otherVehiclesValue) || otherVehiclesValue < 0) {
    valueMissing.push("Current value of the other vehicles your household will keep (enter 0 if none)");
  }
  if ("missing" in gross) valueMissing.push(gross.missing);
  if (valueMissing.length) {
    checks.push(insufficient(valueBase, valueMissing, "We never guess what your other vehicles are worth, so this needs their combined value."));
  } else {
    const annualCents = (gross as { monthlyCents: number }).monthlyCents * 12;
    const otherCents = toCents(otherVehiclesValue as number);
    const totalCents = priceCents + otherCents;
    const ok = atOrBelowPercent(totalCents, annualCents, 50);
    checks.push({
      ...valueBase,
      status: ok ? "meets" : "exceeds",
      actual: `${percent(totalCents, annualCents)} of gross yearly income (${money(totalCents)} of ${money(annualCents)})`,
      explanation: ok
        ? "Everything you'd own with a motor stays under half of a year's income."
        : "Vehicles lose value quickly; this rule suggests keeping their total value under half of a year's income.",
      missing: [],
      notes: [
        `Uses the new vehicle's price (${money(priceCents)}) plus the other vehicles' value you entered (${money(otherCents)}). Ramsey says "annual income"; we use your recorded gross household income.`,
      ],
    });
  }

  checks.push(emergencyReserveCheck(baseline, postEngine, toCents(result.cash.protectedCashRequired), null));
  return checks;
}

// ---- Emergency reserve (both) -------------------------------------------------------------------------------------

function emergencyReserveCheck(
  baseline: MoneyPriorityEngineResult,
  postEngine: MoneyPriorityEngineResult | null,
  protectedCashRequiredCents: number,
  postClosingAvailableCents: number | null,
): GuidelineCheck {
  const base = {
    id: "emergency_reserve" as const,
    title: "Emergency savings: about 3 to 6 months of expenses",
    threshold: "",
    source: GUIDELINE_SOURCES.cfpbEmergency,
  };
  const targetMonths = Math.max(3, (postEngine ?? baseline).secure.emergencyReserveAssessment.effectiveRecommendedMonths);
  base.threshold = targetMonths > 3
    ? `At least ${targetMonths} months of essential expenses and minimum debt payments (your plan's target; general guidance is 3 to 6)`
    : "At least 3 months of essential expenses and minimum debt payments (general guidance is 3 to 6)";
  const notes = [
    "Only cash you've marked as a protected emergency reserve counts. Cash set aside for goals, cash held against a debt and money in retirement accounts are never counted.",
  ];
  if (postClosingAvailableCents !== null && postClosingAvailableCents > 0) {
    notes.push(`About ${money(postClosingAvailableCents)} of unassigned cash would remain after closing; it is not counted as an emergency reserve here.`);
  }

  if (protectedCashRequiredCents > 0) {
    return {
      ...base,
      status: "exceeds",
      actual: `Needs ${money(protectedCashRequiredCents)} more than the cash available for a purchase`,
      explanation: "Paying this would mean dipping into money your plan protects (emergency reserve, goal savings or required cushion).",
      missing: [],
      notes,
    };
  }
  if (!postEngine) {
    return insufficient(base, ["The purchase details marked as missing in the result above"],
      "We can only project your reserves after the purchase once the affordability check has everything it needs.", notes);
  }
  const aggregates = postEngine.snapshot.aggregates;
  if (postEngine.snapshot.expenses.length === 0) {
    return insufficient(base, ["Your regular expenses in the Financial profile"], "We need your recorded expenses to measure months of coverage.", notes);
  }
  const basisCents = toCents(aggregates.monthlyEssentialExpenses) + toCents(aggregates.monthlyMinimumDebtPayments);
  if (!(basisCents > 0)) {
    return insufficient(base, ["Essential expenses in your Financial profile"], "We need your essential monthly costs to measure months of coverage.", notes);
  }
  const reserveCents = toCents(aggregates.protectedCash);
  const ok = reserveCents >= targetMonths * basisCents;
  return {
    ...base,
    status: ok ? "meets" : "exceeds",
    actual: `${(reserveCents / basisCents).toFixed(1)} months (${money(reserveCents)} against ${money(basisCents)}/month after the purchase)`,
    explanation: ok
      ? "Your protected emergency reserve would still cover the target after the purchase."
      : "After the purchase, your protected emergency reserve would cover less than the target. Consider building it up first.",
    missing: [],
    notes,
  };
}
