// FFH-P10 — strict parser for the guided "Can We Afford It?" form (issue #171).
//
// The browser sends only form text. It never sends a household ID, a plan snapshot or a calculated result; unknown
// keys are refused. Amounts are parsed to exact cents on the server. A blank optional cost stays UNKNOWN (null) so the
// canonical evaluator reports "more information needed" — it is never turned into zero.
import type { HomePurchaseScenario } from "../calculations/home-affordability.ts";
import type { VehicleNeedType, VehiclePurchaseScenario } from "../calculations/vehicle-affordability.ts";

export type PurchaseKind = "home" | "vehicle";

export type PurchaseCheckIssue = { path: string; message: string };

export const MAX_OPTIONS = 2;
const MAX_LABEL = 40;
const MAX_MONEY_CENTS = 99_999_999_999; // $999,999,999.99

export const HOME_FIELDS = [
  "purchasePrice", "downPayment", "rateType", "interestRate", "termYears",
  "armInitialFixedMonths", "armAdjustmentFrequencyMonths", "armInitialCap", "armSubsequentCap", "armLifetimeCap",
  "hasBalloonPayment", "allowsNegativeAmortization",
  "closingCosts", "prepaidCosts", "initialEscrowDeposit", "earnestMoneyAlreadyPaid", "sellerCredits", "lenderCredits", "otherCredits",
  "propertyTaxesAnnual", "homeownersInsuranceAnnual", "floodInsuranceAnnual", "otherInsuranceAnnual", "hoaMonthly",
  "mortgageInsuranceType", "mortgageInsuranceMonthly",
  "maintenanceMonthly", "utilityChangeMonthly", "otherPropertyCostsMonthly",
  "immediateRequiredRepairs", "plannedNearTermRepairs",
  "currentHousingMonthlyCost", "currentHousingEnds", "relatedGoalId",
] as const;

export const VEHICLE_FIELDS = [
  "needType", "purchasePrice", "tradeInValue", "tradeInLoanPayoff", "cashDownPayment",
  "salesTax", "titleRegistrationFees", "otherPurchaseFees", "loanApr", "loanTermMonths",
  "monthlyInsuranceChange", "monthlyFuelChange", "monthlyMaintenanceChange", "monthlyRegistrationTaxChange", "monthlyParkingTollsChange",
  "relatedGoalId", "otherVehiclesValue",
] as const;

export type HomeField = (typeof HOME_FIELDS)[number];
export type VehicleField = (typeof VEHICLE_FIELDS)[number];

export type ParsedHomeOption = { kind: "home"; label: string; scenario: HomePurchaseScenario };
export type ParsedVehicleOption = { kind: "vehicle"; label: string; scenario: VehiclePurchaseScenario; otherVehiclesValue: number | null };
export type ParsedOption = ParsedHomeOption | ParsedVehicleOption;

export type ParsedPurchaseCheck = { kind: PurchaseKind; baselineFingerprint: string; options: ParsedOption[] };

type Row = Record<string, unknown>;

function record(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

const MONEY = /^(-)?\$?(\d{1,3}(,\d{3})+|\d{1,12})(\.\d{1,2})?$/;

/** Exact-cents money parser. Returns null for blank, NaN for anything malformed. */
export function parseMoneyText(raw: string, allowNegative: boolean): number | null {
  const text = raw.trim();
  if (text === "") return null;
  const match = MONEY.exec(text);
  if (!match) return Number.NaN;
  const negative = Boolean(match[1]);
  if (negative && !allowNegative) return Number.NaN;
  const whole = match[2].replaceAll(",", "");
  const fraction = (match[4] ?? ".00").slice(1).padEnd(2, "0");
  const cents = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents) || cents > MAX_MONEY_CENTS) return Number.NaN;
  return (negative ? -cents : cents) / 100;
}

function parseRate(raw: string, max: number): number | null {
  const text = raw.trim().replace(/%$/, "").trim();
  if (text === "") return null;
  if (!/^\d{1,3}(\.\d{1,3})?$/.test(text)) return Number.NaN;
  const value = Number(text);
  return value <= max ? value : Number.NaN;
}

function parseWhole(raw: string, min: number, max: number): number | null {
  const text = raw.trim();
  if (text === "") return null;
  if (!/^\d{1,4}$/.test(text)) return Number.NaN;
  const value = Number(text);
  return value >= min && value <= max ? value : Number.NaN;
}

class Reader<F extends string> {
  private readonly fields: Record<F, string>;
  private readonly path: string;
  readonly issues: PurchaseCheckIssue[];

  constructor(fields: Record<F, string>, path: string, issues: PurchaseCheckIssue[]) {
    this.fields = fields;
    this.path = path;
    this.issues = issues;
  }

  private fail(field: F, message: string): void {
    this.issues.push({ path: `${this.path}.${field}`, message });
  }

  /** Optional amount: blank -> null (unknown, never zero). */
  money(field: F, label: string, allowNegative = false): number | null {
    const value = parseMoneyText(this.fields[field], allowNegative);
    if (value !== null && Number.isNaN(value)) {
      this.fail(field, `${label}: enter a dollar amount like 1250 or 1250.50${allowNegative ? " (a minus sign is allowed for a decrease)" : ""}.`);
      return null;
    }
    return value;
  }

  /** Required amount: blank is an input error (the user is asked; nothing is assumed). */
  requiredMoney(field: F, label: string, hint = ""): number {
    const value = this.money(field, label);
    if (value === null) {
      if (!this.issues.some((issue) => issue.path === `${this.path}.${field}`)) this.fail(field, `${label}: required.${hint ? " " + hint : ""}`);
      return Number.NaN;
    }
    return value;
  }

  /** Blank means none (only for credits and amounts already paid, where none is the conservative reading). */
  moneyOrZero(field: F, label: string): number {
    return this.money(field, label) ?? 0;
  }

  rate(field: F, label: string, max: number): number | null {
    const value = parseRate(this.fields[field], max);
    if (value !== null && Number.isNaN(value)) {
      this.fail(field, `${label}: enter a percentage between 0 and ${max}, like 6.25.`);
      return null;
    }
    return value;
  }

  whole(field: F, label: string, min: number, max: number): number | null {
    const value = parseWhole(this.fields[field], min, max);
    if (value !== null && Number.isNaN(value)) {
      this.fail(field, `${label}: enter a whole number from ${min} to ${max}.`);
      return null;
    }
    return value;
  }

  choice<T extends string>(field: F, label: string, allowed: readonly T[]): T | null {
    const value = this.fields[field].trim();
    if ((allowed as readonly string[]).includes(value)) return value as T;
    this.fail(field, `${label}: choose one of the options.`);
    return null;
  }

  goalId(field: F, knownGoalIds: ReadonlySet<string>): string | null {
    const value = this.fields[field].trim();
    if (value === "") return null;
    if (!knownGoalIds.has(value)) {
      this.fail(field, "Savings goal: that goal is no longer in your plan. Choose another or none.");
      return null;
    }
    return value;
  }
}

function readFields<F extends string>(value: unknown, allowed: readonly F[], path: string, issues: PurchaseCheckIssue[]): Record<F, string> | null {
  if (!record(value)) {
    issues.push({ path, message: "The form could not be read. Reload the page and try again." });
    return null;
  }
  const allowedSet = new Set<string>(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issues.push({ path: `${path}.${key}`, message: "The form sent a field this check does not accept." });
  }
  const fields = {} as Record<F, string>;
  for (const key of allowed) {
    const raw = value[key];
    if (raw === undefined) fields[key] = "";
    else if (typeof raw === "string" && raw.length <= 64) fields[key] = raw;
    else {
      issues.push({ path: `${path}.${key}`, message: "The form sent a value this check does not accept." });
      fields[key] = "";
    }
  }
  return fields;
}

export type ParseContext = {
  /** Goal IDs in the server-loaded household snapshot; anything else is refused. */
  goalIds: ReadonlySet<string>;
  /**
   * Monthly housing costs already in the server-loaded plan (housing-category expense monthly equivalents from P09 plus
   * mortgage minimum payments), in cents. A "current housing cost that ends" larger than this would remove costs the
   * plan never counted, so it is refused (prevents double counting either way).
   */
  recordedHousingCents: number;
};

function parseHome(fields: Record<HomeField, string>, path: string, context: ParseContext, issues: PurchaseCheckIssue[]): HomePurchaseScenario {
  const r = new Reader(fields, path, issues);
  const purchasePrice = r.requiredMoney("purchasePrice", "Home price");
  const downPayment = r.requiredMoney("downPayment", "Down payment", "Enter 0 if none.");
  // Audit P10-01/P10-03: every choice must be answered explicitly; a blank answer is refused (never defaulted).
  const rateType = r.choice("rateType", "Rate type", ["fixed", "adjustable"] as const) ?? "fixed";
  const interestRate = r.rate("interestRate", "Interest rate", 30);
  const termYears = r.whole("termYears", "Loan length (years)", 1, 50);
  const armValues = [
    r.whole("armInitialFixedMonths", "Months before the rate first changes", 1, 480),
    r.whole("armAdjustmentFrequencyMonths", "Months between rate changes", 1, 480),
    r.rate("armInitialCap", "First adjustment cap", 30),
    r.rate("armSubsequentCap", "Later adjustment cap", 30),
    r.rate("armLifetimeCap", "Lifetime cap", 30),
  ] as const;
  const arm = rateType === "adjustable" && armValues.every((value) => value !== null)
    ? {
      initialFixedMonths: armValues[0] as number,
      adjustmentFrequencyMonths: armValues[1] as number,
      initialAdjustmentCap: armValues[2] as number,
      subsequentAdjustmentCap: armValues[3] as number,
      lifetimeAdjustmentCap: armValues[4] as number,
    }
    : null; // adjustable with any cap unknown -> the evaluator reports the missing ARM terms
  const hasBalloonPayment = r.choice("hasBalloonPayment", "Balloon payment", ["no", "yes"] as const) === "yes";
  const allowsNegativeAmortization = r.choice("allowsNegativeAmortization", "Balance can grow", ["no", "yes"] as const) === "yes";
  const mortgageInsuranceChoice = r.choice("mortgageInsuranceType", "Mortgage insurance", ["none", "conventional_pmi", "fha_mip", "other", "unsure"] as const);
  // "Not sure yet" keeps the cost unknown: the evaluator then reports the missing mortgage-insurance amount.
  const mortgageInsuranceType = mortgageInsuranceChoice === "unsure" ? "other" : mortgageInsuranceChoice ?? "none";
  const mortgageInsuranceMonthly = mortgageInsuranceChoice === "unsure" ? null : r.money("mortgageInsuranceMonthly", "Monthly mortgage insurance");
  const currentHousingMonthlyCost = r.money("currentHousingMonthlyCost", "Current monthly housing payment");
  const currentHousingEnds = r.choice("currentHousingEnds", "Current housing payment ends", ["yes", "no"] as const) === "yes";

  if (Number.isFinite(purchasePrice) && Number.isFinite(downPayment) && downPayment > purchasePrice) {
    issues.push({ path: `${path}.downPayment`, message: "Down payment: it can't be more than the home price." });
  }
  if (currentHousingEnds && currentHousingMonthlyCost !== null && Math.round(currentHousingMonthlyCost * 100) > context.recordedHousingCents) {
    issues.push({
      path: `${path}.currentHousingMonthlyCost`,
      message: `Current monthly housing payment: this is more than the housing costs in your plan (${(context.recordedHousingCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}/month of housing bills and mortgage payments). Removing costs your plan doesn't count would double count. Enter the amount your plan has, or update your bills first.`,
    });
  }

  return {
    purchasePrice,
    downPayment,
    mortgage: {
      rateType,
      interestRate: interestRate ?? Number.NaN, // unknown rate -> evaluator reports "mortgage.interestRate"
      termYears: termYears ?? Number.NaN,
      arm,
      hasBalloonPayment,
      allowsNegativeAmortization,
    },
    closing: {
      closingCosts: r.money("closingCosts", "Closing costs"),
      prepaidCosts: r.money("prepaidCosts", "Prepaid costs"),
      initialEscrowDeposit: r.money("initialEscrowDeposit", "Initial escrow deposit"),
      earnestMoneyAlreadyPaid: r.moneyOrZero("earnestMoneyAlreadyPaid", "Earnest money already paid"),
      sellerCredits: r.moneyOrZero("sellerCredits", "Seller credits"),
      lenderCredits: r.moneyOrZero("lenderCredits", "Lender credits"),
      otherCredits: r.moneyOrZero("otherCredits", "Other credits"),
    },
    propertyTaxesAnnual: r.money("propertyTaxesAnnual", "Yearly property taxes"),
    insurance: {
      homeownersAnnual: r.money("homeownersInsuranceAnnual", "Yearly homeowners insurance"),
      floodAnnual: r.money("floodInsuranceAnnual", "Yearly flood insurance"),
      otherRequiredAnnual: r.money("otherInsuranceAnnual", "Other required yearly insurance"),
    },
    hoaMonthly: r.money("hoaMonthly", "Monthly HOA dues"),
    mortgageInsurance: { type: mortgageInsuranceType, monthlyAmount: mortgageInsuranceMonthly },
    // Audit P10-02: required in the guided check. The evaluator only flags a blank maintenance amount when the margin
    // is thin, so a blank could otherwise yield a positive verdict with this cost unknown.
    monthlyMaintenancePlanningAmount: r.requiredMoney("maintenanceMonthly", "Monthly maintenance set-aside", "Enter 0 only if you deliberately plan none."),
    monthlyUtilityChange: r.money("utilityChangeMonthly", "Change in monthly utilities", true),
    otherMonthlyPropertyCosts: r.money("otherPropertyCostsMonthly", "Other monthly property costs", true),
    immediateRequiredRepairs: r.requiredMoney("immediateRequiredRepairs", "Repairs needed right away", "Enter 0 if none."),
    plannedNearTermRepairs: r.requiredMoney("plannedNearTermRepairs", "Planned repairs soon after", "Enter 0 if none."),
    currentHousingMonthlyCost,
    currentHousingCostDisappears: currentHousingEnds,
    relatedGoalId: r.goalId("relatedGoalId", context.goalIds),
    homeSale: null,
  };
}

function parseVehicle(fields: Record<VehicleField, string>, path: string, context: ParseContext, issues: PurchaseCheckIssue[]): { scenario: VehiclePurchaseScenario; otherVehiclesValue: number | null } {
  const r = new Reader(fields, path, issues);
  const needType = r.choice("needType", "Why you're buying", ["necessary", "planned_replacement", "optional_upgrade"] as const) ?? "optional_upgrade";
  const tradeInValue = r.moneyOrZero("tradeInValue", "Trade-in value");
  const tradeInLoanPayoffRaw = r.money("tradeInLoanPayoff", "Loan left on the trade-in");
  if (tradeInValue > 0 && tradeInLoanPayoffRaw === null && !issues.some((issue) => issue.path === `${path}.tradeInLoanPayoff`)) {
    issues.push({ path: `${path}.tradeInLoanPayoff`, message: "Loan left on the trade-in: required when you have a trade-in. Enter 0 if it's paid off." });
  }
  const scenario: VehiclePurchaseScenario = {
    needType: needType as VehicleNeedType,
    purchasePrice: r.requiredMoney("purchasePrice", "Vehicle price"),
    tradeInValue,
    tradeInLoanPayoff: tradeInLoanPayoffRaw ?? 0,
    cashDownPayment: r.requiredMoney("cashDownPayment", "Cash you'll put down", "Enter 0 if none."),
    salesTax: r.money("salesTax", "Sales tax"),
    titleRegistrationFees: r.money("titleRegistrationFees", "Title and registration fees"),
    otherPurchaseFees: r.money("otherPurchaseFees", "Other dealer or purchase fees"),
    loanApr: r.rate("loanApr", "Loan APR", 40),
    loanTermMonths: r.whole("loanTermMonths", "Loan length (months)", 1, 120),
    monthlyInsuranceChange: r.money("monthlyInsuranceChange", "Change in monthly insurance", true),
    monthlyFuelChange: r.money("monthlyFuelChange", "Change in monthly fuel or charging", true),
    monthlyMaintenanceChange: r.money("monthlyMaintenanceChange", "Change in monthly maintenance", true),
    monthlyRegistrationTaxChange: r.money("monthlyRegistrationTaxChange", "Change in monthly registration and taxes", true),
    monthlyParkingTollsChange: r.money("monthlyParkingTollsChange", "Change in monthly parking and tolls", true),
    relatedGoalId: r.goalId("relatedGoalId", context.goalIds),
    coreNeedAmount: null,
  };
  // Contradiction check only (never used in a calculation): cash down above price plus known taxes and fees.
  const knownTotalCents = Math.round(scenario.purchasePrice * 100)
    + [scenario.salesTax, scenario.titleRegistrationFees, scenario.otherPurchaseFees].reduce<number>((sum, value) => sum + Math.round((value ?? 0) * 100), 0);
  if (Number.isFinite(scenario.purchasePrice) && Number.isFinite(scenario.cashDownPayment) && Math.round(scenario.cashDownPayment * 100) > knownTotalCents) {
    issues.push({ path: `${path}.cashDownPayment`, message: "Cash you'll put down: it can't be more than the vehicle price plus taxes and fees." });
  }
  return { scenario, otherVehiclesValue: r.money("otherVehiclesValue", "Value of your other vehicles") };
}

export function parsePurchaseCheck(value: unknown, context: ParseContext): { parsed: ParsedPurchaseCheck | null; issues: PurchaseCheckIssue[] } {
  const issues: PurchaseCheckIssue[] = [];
  if (!record(value)) return { parsed: null, issues: [{ path: "request", message: "The check could not be read. Reload the page and try again." }] };
  for (const key of Object.keys(value)) {
    if (!["kind", "baselineFingerprint", "options"].includes(key)) issues.push({ path: `request.${key}`, message: "The check sent a field it does not accept." });
  }
  const kind = value.kind === "home" || value.kind === "vehicle" ? value.kind : null;
  if (!kind) issues.push({ path: "request.kind", message: "Choose a home or a vehicle." });
  if (typeof value.baselineFingerprint !== "string" || !value.baselineFingerprint.trim() || value.baselineFingerprint.length > 200) {
    issues.push({ path: "request.baselineFingerprint", message: "The page is out of date. Reload it and try again." });
  }
  if (!Array.isArray(value.options) || value.options.length < 1 || value.options.length > MAX_OPTIONS) {
    issues.push({ path: "request.options", message: `Check one option, or two side by side.` });
  }
  if (issues.length || !kind) return { parsed: null, issues };

  const options: ParsedOption[] = [];
  (value.options as unknown[]).forEach((option, index) => {
    const path = `options[${index}]`;
    if (!record(option)) {
      issues.push({ path, message: "The form could not be read. Reload the page and try again." });
      return;
    }
    for (const key of Object.keys(option)) {
      if (!["label", "fields"].includes(key)) issues.push({ path: `${path}.${key}`, message: "The form sent a field it does not accept." });
    }
    const label = typeof option.label === "string" ? option.label.trim().slice(0, MAX_LABEL) : "";
    const safeLabel = label || `Option ${index === 0 ? "A" : "B"}`;
    if (kind === "home") {
      const fields = readFields(option.fields, HOME_FIELDS, `${path}.fields`, issues);
      if (fields) options.push({ kind, label: safeLabel, scenario: parseHome(fields, `${path}.fields`, context, issues) });
    } else {
      const fields = readFields(option.fields, VEHICLE_FIELDS, `${path}.fields`, issues);
      if (fields) {
        const parsed = parseVehicle(fields, `${path}.fields`, context, issues);
        options.push({ kind, label: safeLabel, scenario: parsed.scenario, otherVehiclesValue: parsed.otherVehiclesValue });
      }
    }
  });
  if (issues.length) return { parsed: null, issues };
  return { parsed: { kind, baselineFingerprint: value.baselineFingerprint as string, options }, issues };
}
