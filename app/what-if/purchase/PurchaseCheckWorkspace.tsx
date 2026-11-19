"use client";

// FFH-P10 guided "Can We Afford It?" workspace. Entries live only in this component's state; the server action is
// read-only and returns the canonical evaluator result plus separate educational guidance. Nothing is saved.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { runPurchaseCheckAction } from "./actions";
import type { PurchaseCheckBootstrap, PurchaseCheckResponse, PurchaseOptionResult } from "@/lib/purchase-check/purchase-check-execution";
import type { GuidelineCheck } from "@/lib/purchase-check/guidance";
import { GUIDELINE_DISCLAIMER } from "@/lib/purchase-check/guidance";
import { FINANCING_LABEL, GUIDELINE_STATUS_LABEL, VERDICT_LABEL, VERDICT_SUMMARY } from "@/lib/purchase-check/purchase-check-presentation";
import { formatPlanMoney } from "@/lib/plan/money-plan";

type Kind = "home" | "vehicle";
type Fields = Record<string, string>;
type Option = { label: string; fields: Fields };

type FieldSpec = {
  name: string;
  label: string;
  hint?: string;
  unit?: "money" | "percent" | "months" | "years";
  required?: boolean;
  choices?: Array<[string, string]>;
  goal?: boolean;
  /** Blank means none (credits, amounts already paid, no trade-in), so the placeholder says so instead of "Unknown". */
  blankMeansNone?: boolean;
};

type Section = { title: string; intro?: string; fields: FieldSpec[]; advanced?: boolean };

const BLANK_OK = "Leave blank if you don't know yet — it stays unknown, never zero.";

const HOME_SECTIONS: Section[] = [
  {
    title: "The home and your down payment",
    fields: [
      { name: "purchasePrice", label: "Home price", unit: "money", required: true },
      { name: "downPayment", label: "Down payment", unit: "money", required: true, hint: "Enter 0 if none." },
      { name: "relatedGoalId", label: "Savings goal to use (optional)", goal: true, hint: "Money set aside for this goal can go toward the purchase." },
    ],
  },
  {
    title: "The loan",
    fields: [
      { name: "interestRate", label: "Interest rate", unit: "percent", hint: "The note rate, for example 6.5." },
      { name: "termYears", label: "Loan length", unit: "years" },
      { name: "rateType", label: "Rate type", choices: [["fixed", "Fixed"], ["adjustable", "Adjustable (ARM)"]] },
      { name: "mortgageInsuranceType", label: "Mortgage insurance", choices: [["none", "None"], ["conventional_pmi", "PMI (conventional)"], ["fha_mip", "FHA MIP"], ["other", "Other"]] },
      { name: "mortgageInsuranceMonthly", label: "Monthly mortgage insurance", unit: "money", hint: "Needed if you have mortgage insurance." },
    ],
  },
  {
    title: "More loan details",
    advanced: true,
    intro: "Only for adjustable-rate or unusual loans.",
    fields: [
      { name: "armInitialFixedMonths", label: "Months before the rate first changes", unit: "months" },
      { name: "armAdjustmentFrequencyMonths", label: "Months between rate changes", unit: "months" },
      { name: "armInitialCap", label: "First change cap", unit: "percent" },
      { name: "armSubsequentCap", label: "Later change cap", unit: "percent" },
      { name: "armLifetimeCap", label: "Lifetime cap", unit: "percent" },
      { name: "hasBalloonPayment", label: "Balloon payment at the end?", choices: [["no", "No"], ["yes", "Yes"]] },
      { name: "allowsNegativeAmortization", label: "Can the balance grow?", choices: [["no", "No"], ["yes", "Yes"]] },
    ],
  },
  {
    title: "Cash at closing",
    intro: "Ask your lender for a Loan Estimate. " + BLANK_OK,
    fields: [
      { name: "closingCosts", label: "Closing costs", unit: "money" },
      { name: "prepaidCosts", label: "Prepaid costs", unit: "money", hint: "Prepaid interest, insurance and taxes. Enter 0 if none." },
      { name: "initialEscrowDeposit", label: "Initial escrow deposit", unit: "money", hint: "Enter 0 if none." },
      { name: "earnestMoneyAlreadyPaid", label: "Earnest money already paid", unit: "money", hint: "Blank means none." , blankMeansNone: true },
      { name: "sellerCredits", label: "Seller credits", unit: "money", hint: "Blank means none." , blankMeansNone: true },
      { name: "lenderCredits", label: "Lender credits", unit: "money", hint: "Blank means none." , blankMeansNone: true },
      { name: "otherCredits", label: "Other credits", unit: "money", hint: "Blank means none." , blankMeansNone: true },
      { name: "immediateRequiredRepairs", label: "Repairs needed right away", unit: "money", required: true, hint: "Enter 0 if none." },
      { name: "plannedNearTermRepairs", label: "Repairs planned soon after", unit: "money", required: true, hint: "Enter 0 if none. Shown as a caution, not paid at closing." },
    ],
  },
  {
    title: "Monthly ownership costs",
    intro: BLANK_OK,
    fields: [
      { name: "propertyTaxesAnnual", label: "Property taxes per year", unit: "money" },
      { name: "homeownersInsuranceAnnual", label: "Homeowners insurance per year", unit: "money" },
      { name: "floodInsuranceAnnual", label: "Flood insurance per year", unit: "money", hint: "Enter 0 if not required." },
      { name: "otherInsuranceAnnual", label: "Other required insurance per year", unit: "money", hint: "Enter 0 if none." },
      { name: "hoaMonthly", label: "HOA dues per month", unit: "money", hint: "Enter 0 if none." },
      { name: "maintenanceMonthly", label: "Maintenance set-aside per month", unit: "money" },
      { name: "utilityChangeMonthly", label: "Change in utilities per month", unit: "money", hint: "Use a minus sign if they'd go down; 0 if about the same." },
      { name: "otherPropertyCostsMonthly", label: "Other property costs per month", unit: "money", hint: "Enter 0 if none." },
    ],
  },
  {
    title: "Your current housing",
    fields: [
      { name: "currentHousingMonthlyCost", label: "Current housing payment per month", unit: "money", hint: "Rent or mortgage, plus housing bills that would stop. Needed even if you keep paying it (then it stays in your plan)." },
      { name: "currentHousingEnds", label: "Would that payment end?", choices: [["yes", "Yes, it ends"], ["no", "No, we keep paying it"]] },
    ],
  },
];

const VEHICLE_SECTIONS: Section[] = [
  {
    title: "The vehicle",
    fields: [
      { name: "needType", label: "Why are you buying?", required: true, choices: [["", "Choose…"], ["necessary", "We need transportation"], ["planned_replacement", "Planned replacement"], ["optional_upgrade", "Optional upgrade"]] },
      { name: "purchasePrice", label: "Vehicle price", unit: "money", required: true },
      { name: "relatedGoalId", label: "Savings goal to use (optional)", goal: true },
    ],
  },
  {
    title: "Paying for it",
    intro: BLANK_OK,
    fields: [
      { name: "cashDownPayment", label: "Cash you'll put down", unit: "money", required: true, hint: "Enter 0 if none." },
      { name: "tradeInValue", label: "Trade-in value", unit: "money", hint: "Blank means no trade-in." , blankMeansNone: true },
      { name: "tradeInLoanPayoff", label: "Loan left on the trade-in", unit: "money", hint: "Needed with a trade-in; 0 if it's paid off." },
      { name: "salesTax", label: "Sales tax", unit: "money" },
      { name: "titleRegistrationFees", label: "Title and registration fees", unit: "money" },
      { name: "otherPurchaseFees", label: "Other dealer or purchase fees", unit: "money", hint: "Enter 0 if none." },
      { name: "loanApr", label: "Loan APR", unit: "percent", hint: "Needed if you'll finance part of it." },
      { name: "loanTermMonths", label: "Loan length", unit: "months" },
    ],
  },
  {
    title: "Ongoing costs: the change from today",
    intro: "Enter only the difference from what your plan already includes. If you're replacing a car, its current insurance and fuel are already in your bills. Use a minus sign for a decrease. " + BLANK_OK,
    fields: [
      { name: "monthlyInsuranceChange", label: "Insurance per month", unit: "money" },
      { name: "monthlyFuelChange", label: "Fuel or charging per month", unit: "money" },
      { name: "monthlyMaintenanceChange", label: "Maintenance per month", unit: "money" },
      { name: "monthlyRegistrationTaxChange", label: "Registration and taxes per month", unit: "money", hint: "0 if about the same." },
      { name: "monthlyParkingTollsChange", label: "Parking and tolls per month", unit: "money", hint: "0 if about the same." },
    ],
  },
  {
    title: "For the rules of thumb (optional)",
    intro: "Used only for the educational guidance, never for the affordability result.",
    fields: [
      { name: "otherVehiclesValue", label: "Value of the other vehicles you'll keep", unit: "money", hint: "Cars, motorcycles, boats — anything with a motor. Enter 0 if none. Don't include a car you're trading in or selling." },
    ],
  },
];

function initialFields(kind: Kind): Fields {
  const sections = kind === "home" ? HOME_SECTIONS : VEHICLE_SECTIONS;
  const fields: Fields = {};
  for (const section of sections) for (const field of section.fields) fields[field.name] = field.choices ? field.choices[0][0] : "";
  if (kind === "home") fields.termYears = "30";
  return fields;
}

const money = (value: number) => formatPlanMoney(value);

function Field({ spec, value, onChange, id, goals, error }: { spec: FieldSpec; value: string; onChange: (value: string) => void; id: string; goals: PurchaseCheckBootstrap["goals"]; error?: string }) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [spec.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  let control;
  if (spec.goal) {
    control = <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={describedBy}>
      <option value="">None</option>
      {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
    </select>;
  } else if (spec.choices) {
    control = <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={describedBy} aria-invalid={error ? true : undefined} required={spec.required}>
      {spec.choices.map(([v, label]) => <option key={v} value={v} disabled={v === "" && spec.required}>{label}</option>)}
    </select>;
  } else {
    const suffix = spec.unit === "percent" ? "%" : spec.unit === "months" ? "months" : spec.unit === "years" ? "years" : null;
    control = <span className={`field-affix field-affix-${spec.unit === "money" ? "money" : spec.unit === "percent" ? "percent" : "unit"}`}>
      {spec.unit === "money" ? <span className="field-prefix" aria-hidden="true">$</span> : null}
      <input id={id} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)}
        placeholder={spec.required ? "Required" : spec.blankMeansNone ? "None" : "Unknown"} aria-describedby={describedBy} aria-invalid={error ? true : undefined} aria-required={spec.required || undefined} />
      {suffix ? <span className="field-suffix" aria-hidden="true">{suffix}</span> : null}
    </span>;
  }
  return <div className="field">
    <label className="field-label" htmlFor={id}>{spec.label}{spec.required ? <span aria-hidden="true"> *</span> : null}</label>
    {control}
    {spec.hint ? <small id={hintId} className="field-hint">{spec.hint}</small> : null}
    {error ? <small id={errorId} className="field-error">{error}</small> : null}
  </div>;
}

function OptionForm({ kind, option, index, onChange, goals, errors, recordedHousing }: { kind: Kind; option: Option; index: number; onChange: (option: Option) => void; goals: PurchaseCheckBootstrap["goals"]; errors: Map<string, string>; recordedHousing: number }) {
  const sections = kind === "home" ? HOME_SECTIONS : VEHICLE_SECTIONS;
  const set = (name: string, value: string) => onChange({ ...option, fields: { ...option.fields, [name]: value } });
  const prefix = `opt${index}`;
  // Display-only reminder (the server decides): an amount below what the plan counts leaves the rest in the plan.
  const enteredHousing = Number((option.fields.currentHousingMonthlyCost ?? "").replace(/[$,\s]/g, ""));
  const housingShort = kind === "home" && option.fields.currentHousingEnds === "yes" && option.fields.currentHousingMonthlyCost?.trim()
    && Number.isFinite(enteredHousing) && enteredHousing >= 0 && Math.round(enteredHousing * 100) < Math.round(recordedHousing * 100);
  return <fieldset className="purchase-option-form">
    <legend>{option.label}</legend>
    <div className="field">
      <label className="field-label" htmlFor={`${prefix}-label`}>Name this option</label>
      <input id={`${prefix}-label`} type="text" maxLength={40} value={option.label} onChange={(event) => onChange({ ...option, label: event.target.value })} />
    </div>
    {sections.map((section) => {
      const body = <div className="purchase-fields">
        {section.intro ? <p className="muted purchase-section-intro">{section.intro}</p> : null}
        {section.fields.map((spec) => <Field key={spec.name} spec={spec} id={`${prefix}-${spec.name}`} value={option.fields[spec.name] ?? ""}
          onChange={(value) => set(spec.name, value)} goals={goals} error={errors.get(`options[${index}].fields.${spec.name}`)} />)}
        {section.fields.some((spec) => spec.name === "currentHousingMonthlyCost") && housingShort
          ? <p className="muted purchase-section-intro" role="note">This is less than the {money(recordedHousing)} your plan counts for housing. The difference stays in your plan after the purchase, which is right only for housing bills that would continue.</p>
          : null}
      </div>;
      const hasError = section.fields.some((spec) => errors.has(`options[${index}].fields.${spec.name}`));
      return section.advanced
        ? <details key={section.title} className="purchase-section scenario-advanced" open={hasError || undefined}><summary>{section.title}</summary><div className="scenario-advanced-content">{body}</div></details>
        : <section key={section.title} className="purchase-section" aria-label={section.title}><h3>{section.title}</h3>{body}</section>;
    })}
  </fieldset>;
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div><dt>{label}</dt><dd>{value}{note ? <small>{note}</small> : null}</dd></div>;
}

function GuidanceItem({ item }: { item: GuidelineCheck }) {
  const kindLabel = item.source.kind === "lender_guideline" ? "Mortgage industry guideline" : item.source.kind === "consumer_agency_guidance" ? "Consumer agency guidance" : "Financial educator's recommendation";
  return <li className={`guidance-item guidance-${item.status}`}>
    <div className="guidance-head">
      <strong>{item.title}</strong>
      <span className={`guidance-status guidance-status-${item.status}`}>{GUIDELINE_STATUS_LABEL[item.status]}</span>
    </div>
    <dl className="guidance-figures">
      <div><dt>Yours</dt><dd>{item.actual ?? "Insufficient information"}</dd></div>
      <div><dt>Guideline</dt><dd>{item.threshold}</dd></div>
    </dl>
    <p>{item.explanation}</p>
    {item.missing.length ? <div><p className="guidance-missing-title">Needed:</p><ul>{item.missing.map((text) => <li key={text}>{text}</li>)}</ul></div> : null}
    {item.notes.map((note) => <p key={note} className="muted guidance-note">{note}</p>)}
    <p className="guidance-source">{kindLabel}: <a href={item.source.url} target="_blank" rel="noopener noreferrer">{item.source.label}<span className="visually-hidden"> (opens in a new tab)</span></a></p>
  </li>;
}

function ResultCard({ option, index, simple }: { option: PurchaseOptionResult; index: number; simple: boolean }) {
  const state = option.kind === "home" ? option.canonical.overallAffordability : option.canonical.affordability;
  const checked = option.retirementMonthlyAfter !== null;
  const planImpact = option.canonical.planImpact;
  const protectedCash = option.kind === "home" ? option.canonical.cashToClose.protectedCashRequired : option.canonical.cash.protectedCashRequired;
  return <article className={`purchase-result-card purchase-verdict-${state}`} aria-labelledby={`result-${index}`}>
    <p className="eyebrow">{option.label}</p>
    <h3 id={`result-${index}`} className="purchase-verdict">{VERDICT_LABEL[state]}</h3>
    <p className="muted">{VERDICT_SUMMARY[state]}</p>

    {option.missing.length ? <section className="purchase-missing" aria-label="Missing information">
      <h4>Still needed for a verdict</h4>
      <ul>{option.missing.map((text) => <li key={text}>{text}</li>)}</ul>
    </section> : null}

    {option.missing.length ? <p className="purchase-incomplete-note">The figures below leave out the unknown costs listed above, so the real amounts will be higher. They become complete once those are filled in.</p> : null}

    <section aria-label="Cash at purchase">
      <h4>Cash at purchase</h4>
      {option.kind === "home" ? <dl className="purchase-figures">
        <Row label="Cash needed at closing" value={money(option.canonical.cashToClose.cashStillRequiredAtClosing)} note="After credits and earnest money already paid" />
        <Row label="Cash available for this purchase" value={money(option.canonical.cashToClose.legitimateCashAvailable)} note="After your reserves, cushion and higher priorities" />
        <Row label="Would come from protected money" value={money(option.canonical.cashToClose.protectedCashRequired)} />
        <Row label="Available cash left after closing" value={money(option.canonical.cashToClose.postClosingAvailableLiquidity)} />
      </dl> : <dl className="purchase-figures">
        <Row label="Total cost after trade-in" value={money(option.canonical.acquisition.netAcquisitionCost)} note="Price plus taxes and fees, minus trade-in equity" />
        <Row label="Cash needed" value={money(option.canonical.cash.cashRequired)} />
        <Row label="Cash available for this purchase" value={money(option.canonical.cash.availableVehicleCash)} note="After your reserves, cushion and higher priorities" />
        <Row label="Would come from protected money" value={money(option.canonical.cash.protectedCashRequired)} />
        <Row label="Amount financed" value={money(option.canonical.acquisition.amountFinanced)} />
      </dl>}
    </section>

    <section aria-label="Every month">
      <h4>Every month</h4>
      {option.kind === "home" ? <dl className="purchase-figures">
        <Row label="Principal and interest" value={money(option.canonical.monthly.principalAndInterest)} />
        <Row label="Taxes, insurance, HOA, mortgage insurance" value={money(option.canonical.monthly.taxesInsuranceHoaAndMortgageInsurance)} />
        <Row label="Maintenance, utilities, other" value={money(option.canonical.monthly.maintenanceAndOtherPropertyCosts)} />
        <Row label="All-in housing cost" value={money(option.canonical.monthly.allInHousingCost)} />
        <Row label="Change from today" value={money(option.canonical.monthly.incrementalHousingImpact)} />
        <Row label="Monthly cash flow after the purchase" value={money(option.canonical.monthly.postPurchaseCashFlow)} note="Before savings" />
        <Row label="Room left after protected priorities" value={money(option.canonical.monthly.postPurchasePlanMargin)} />
      </dl> : <dl className="purchase-figures">
        <Row label="Loan payment" value={money(option.canonical.monthlyImpact.loanPayment)} />
        <Row label="Change in ongoing costs" value={money(option.canonical.monthlyImpact.operatingCostChange)} />
        <Row label="Total monthly change" value={money(option.canonical.monthlyImpact.allInMonthlyImpact)} />
        <Row label="Monthly cash flow after the purchase" value={money(option.canonical.monthlyImpact.postPurchaseCashFlow)} note="Before savings" />
        <Row label="Room left after protected priorities" value={money(option.canonical.monthlyImpact.postPurchasePlanMargin)} />
      </dl>}
    </section>

    <section aria-label="Effect on your plan">
      <h4>Effect on your plan</h4>
      {checked ? <dl className="purchase-figures">
        <Row label="Full employer match still captured" value={planImpact.employerMatchPreserved ? "Yes" : "No"} />
        <Row label="Emergency and protected priorities still funded" value={planImpact.secureNeedsPreserved ? "Yes" : "No"} />
        <Row label="Required goals still funded" value={planImpact.requiredGoalsPreserved ? "Yes" : "No"} />
        <Row label="Retirement saving per month" value={`${money(option.retirementMonthlyBefore)} → ${money(option.retirementMonthlyAfter as number)}`} />
        {option.goalEffects.map((effect) => <Row key={effect.name} label={`Goal: ${effect.name}`} value={effect.usedForPurchase ? "Used for this purchase" : `${money(effect.beforeMonthly)} → ${money(effect.afterMonthly)} per month`} />)}
      </dl> : <p className="muted">{protectedCash > 0
        ? "Your plan after the purchase wasn't worked out, because paying for it would need money your plan protects."
        : "Your plan after the purchase is worked out once the missing details are filled in."}</p>}
    </section>

    <section aria-label="Financing and ownership cautions">
      <h4>Financing and ownership cautions</h4>
      <p><strong>{FINANCING_LABEL[option.canonical.financing.quality]}</strong></p>
      <ul>
        {option.canonical.financing.reasons.map((text) => <li key={`f-${text}`}>{text}</li>)}
        {option.canonical.risks.map((text) => <li key={`r-${text}`}>{text}</li>)}
        {option.kind === "home" ? option.canonical.warnings.map((text) => <li key={`w-${text}`}>{text}</li>) : null}
      </ul>
      <p className="muted">Being approved for a loan doesn&apos;t mean it fits your plan.</p>
    </section>

    {!simple ? <details className="scenario-diagnostics">
      <summary>Technical details</summary>
      <code>{option.kind === "home"
        ? `overall=${option.canonical.overallAffordability}; purchase=${option.canonical.purchaseReadiness}; ongoing=${option.canonical.ongoingAffordability}; financing=${option.canonical.financing.quality}`
        : `affordability=${option.canonical.affordability}; financing=${option.canonical.financing.quality}`}</code>
      {option.canonical.missingData.length ? <code>missing={option.canonical.missingData.join(", ")}</code> : null}
    </details> : null}
  </article>;
}

function GuidanceSection({ option, index }: { option: PurchaseOptionResult; index: number }) {
  return <section className="purchase-guidance" aria-labelledby={`guidance-${index}`}>
    <p className="eyebrow">{option.label}</p>
    <h3 id={`guidance-${index}`}>Financial rules of thumb</h3>
    <p className="muted">{GUIDELINE_DISCLAIMER} Meeting a rule of thumb does not make a purchase affordable.</p>
    <ul className="guidance-list">{option.guidance.map((item) => <GuidanceItem key={item.id} item={item} />)}</ul>
  </section>;
}

export default function PurchaseCheckWorkspace({ kind, bootstrap, simple }: { kind: Kind; bootstrap: PurchaseCheckBootstrap; simple: boolean }) {
  const router = useRouter();
  const [options, setOptions] = useState<Option[]>([{ label: "Option A", fields: initialFields(kind) }]);
  const [response, setResponse] = useState<PurchaseCheckResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const [checkedEntries, setCheckedEntries] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const errors = new Map<string, string>((response?.status === "invalid" ? response.issues : []).map((issue) => [issue.path, issue.message]));
  const generalErrors = response && response.status !== "ok" ? response.issues.filter((issue) => !issue.path.includes(".fields.")) : [];

  const change = (index: number, next: Option) => setOptions((current) => current.map((item, i) => (i === index ? next : item)));
  const addSecond = () => setOptions((current) => current.length >= 2 ? current : [...current, { label: "Option B", fields: structuredClone(current[0].fields) }]);
  const removeSecond = () => { setOptions((current) => current.slice(0, 1)); setResponse(null); };

  const run = () => {
    const entries = JSON.stringify(options);
    startTransition(async () => {
      try {
        const result = await runPurchaseCheckAction({
          kind,
          baselineFingerprint: bootstrap.baselineFingerprint,
          options: options.map((option) => ({ label: option.label, fields: option.fields })),
        });
        setFailed(false);
        setResponse(result);
        setCheckedEntries(entries);
      } catch {
        // A redirected action (session ended or two-factor now needed), a network error or a server error:
        // keep the entries and show a fixed message; nothing from the error is displayed.
        setResponse(null);
        setFailed(true);
      }
      requestAnimationFrame(() => statusRef.current?.focus());
    });
  };
  const outdated = response?.status === "ok" && checkedEntries !== null && checkedEntries !== JSON.stringify(options);

  const results = response?.status === "ok" ? response.options : [];

  return <div className="purchase-workspace">
    {!bootstrap.grossIncomeComplete ? <p className="muted purchase-income-note">Some income sources don&apos;t have a before-tax (gross) amount, so the income-based rules of thumb will show &quot;Insufficient information&quot;. The affordability check still works.</p> : null}
    {kind === "home" ? <p className="muted">Your plan currently counts {money(bootstrap.recordedHousingMonthly)} a month for housing bills and mortgage payments (yearly and quarterly bills as their monthly amount). Use that for your current housing payment so nothing is counted twice.</p>
      : bootstrap.recordedVehicleLoanPaymentsMonthly > 0 ? <p className="muted">Your plan has {money(bootstrap.recordedVehicleLoanPaymentsMonthly)} a month of vehicle loan payments.</p> : null}

    <form className={`purchase-forms purchase-forms-${options.length}`} onSubmit={(event) => { event.preventDefault(); run(); }} noValidate>
      {options.map((option, index) => <OptionForm key={index} kind={kind} option={option} index={index} onChange={(next) => change(index, next)} goals={bootstrap.goals} errors={errors} recordedHousing={bootstrap.recordedHousingMonthly} />)}
      <div className="purchase-actions">
        <button type="submit" disabled={pending}>{pending ? "Checking…" : options.length === 2 ? "Check both options" : "Check this purchase"}</button>
        {options.length === 1
          ? <button type="button" className="secondary-button" onClick={addSecond}>Compare a second option</button>
          : <button type="button" className="secondary-button" onClick={removeSecond}>Remove {options[1].label || "Option B"}</button>}
      </div>
    </form>

    <div ref={statusRef} tabIndex={-1} className="purchase-status" role="status" aria-live="polite">
      {pending ? "Checking against your current plan…" : null}
      {!pending && response?.status === "invalid" ? <div className="form-error"><strong>Please fix the highlighted entries.</strong>{generalErrors.length ? <ul>{generalErrors.map((issue) => <li key={issue.path}>{issue.message}</li>)}</ul> : null}</div> : null}
      {!pending && response?.status === "stale_baseline" ? <div className="dashboard-notice"><div><strong>Your numbers changed</strong><p>{response.issues[0]?.message}</p></div><button type="button" className="secondary-button" onClick={() => { setResponse(null); router.refresh(); }}>Refresh my numbers</button></div> : null}
      {!pending && response?.status === "unauthorized" ? <p className="form-error">Your session ended. Please sign in again.</p> : null}
      {!pending && failed ? <p className="form-error">The check didn&apos;t run. Your session may have ended or need your two-factor code: reload the page (sign in again if asked). Your entries here are not saved.</p> : null}
      {!pending && outdated ? <p className="purchase-incomplete-note">You changed the entries since this check. The results below are for the previous entries — press Check again.</p> : null}
      {!pending && results.length ? `Checked ${results.length === 2 ? "both options" : "this purchase"}. Results below.` : null}
    </div>

    {results.length ? <>
      <section className={`purchase-results${outdated ? " purchase-results-outdated" : ""} purchase-results-${results.length}`} aria-label="Affordability results">
        {results.map((option, index) => <ResultCard key={index} index={index} option={option} simple={simple} />)}
      </section>
      <section className={`purchase-results${outdated ? " purchase-results-outdated" : ""} purchase-results-${results.length}`} aria-label="Financial rules of thumb">
        {results.map((option, index) => <GuidanceSection key={index} index={index} option={option} />)}
      </section>
    </> : null}
  </div>;
}
