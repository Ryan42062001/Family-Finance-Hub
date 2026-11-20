// FFH-P12 per-paycheck plan (Owner-approved design: GitHub issue #203). Pure: every input is loaded by the caller from
// a fresh server-side read; nothing here is saved anywhere. It is a timing and feasibility VIEW of facts the household
// already has, never a second ledger:
//   * expected deposits come only from the schedules the household typed (monthly income stays the plan's authority);
//   * scheduled P09 bills count at their ACTUAL amount on their ACTUAL due date, in the deposit interval that date falls
//     in, even across a month boundary (safeguard 1). A scheduled bill's monthly equivalent is therefore not counted
//     again; only UNSCHEDULED expenses and debt minimums become monthly-average allowances;
//   * the Money Priority Engine's monthly steps are used exactly as the plan shows them, in its order, split across the
//     month's expected deposits in exact cents (more deposits in a month share the same amount, never multiply it);
//   * known bills and required spending come first: a step a paycheck cannot carry is shown as partly or not covered,
//     a shortfall is shown as a shortfall, and no later paycheck is used to hide it (safeguard 3);
//   * a positive remainder is only called an estimate when nothing material is missing or unreconciled (safeguard 2);
//   * set-aside amounts the household reported (P11) are context only: never cash, never subtracted from a bill.
import { monthlyEquivalentCents, monthEnd, monthStart, occurrencesBetween, addDays, type IsoDate, type Recurrence } from "../bills/schedule.ts";
import type { BillInput } from "../bills/bills-view.ts";
import { apportionCents } from "./apportion.ts";
import { depositDates, monthlyEquivalentOfDeposit, MONTHLY_EQUIVALENT_RULE, scheduleShapeError, type PayFrequency, type PaySchedule } from "./schedule.ts";

export const HORIZON_DAYS = 60;
// How far past the 60-day window a FOLLOWING deposit is looked for, so the last paycheck's bills are bounded by it.
export const LOOKAHEAD_DAYS = 31;

export class PaycheckDataError extends Error {}

export type IncomeFact = { id: string; name: string; ownerName: string | null; monthlyCents: number; isActive: boolean; isVariable: boolean };
export type SpendingTreatment = "required" | "discretionary";
export type PlanStepFact = { id: string; rank: number; title: string; stateLabel: string; monthlyCents: number };
export type SetAsideFact = { expenseId: string; cycleDue: IsoDate; reservedCents: number };

export type PaycheckPlanInput = {
  today: IsoDate;
  incomes: IncomeFact[];
  schedules: PaySchedule[];
  bills: BillInput[];
  expenseTreatment: Map<string, SpendingTreatment>; // every expense id -> the plan's own spending treatment
  steps: PlanStepFact[] | null; // the plan's steps with a monthly amount, in rank order; null = no plan available
  setAsides: SetAsideFact[];
};

export type Deposit = {
  key: string;
  date: IsoDate;
  sourceId: string;
  sourceName: string;
  ownerName: string | null;
  frequency: PayFrequency;
  cents: number;
  variable: boolean;
};

export type BillLine = {
  billId: string;
  kind: "expense" | "debt";
  name: string;
  date: IsoDate;
  cents: number; // the actual payment on this date
  recurrence: Recurrence;
  monthlyCents: number; // its monthly planning equivalent, shown for comparison only (not counted again)
  dueOnPayday: boolean;
  nextMonth: boolean; // due in a later calendar month than the deposit (still this paycheck's obligation)
  setAsideCents: number | null; // P11: amount the household REPORTED as set aside for this due date (context only)
};

export type AllowanceKey = "required" | "discretionary" | "debt";
export type Allowance = { key: AllowanceKey; label: string; cents: number; items: string[] };

export type StepCoverage = "covered" | "partly" | "not_covered";
export type StepLine = { id: string; rank: number; title: string; stateLabel: string; monthlyCents: number; shareCents: number; supportedCents: number; coverage: StepCoverage };

export type Uncertainty =
  | { kind: "variable"; source: string }
  | { kind: "irregular"; source: string }
  | { kind: "zero_deposit"; source: string }
  | { kind: "no_following_deposit"; through: IsoDate }
  | { kind: "month_unapportioned"; month: IsoDate }
  | { kind: "income_mismatch" }
  | { kind: "unscheduled_income" }
  | { kind: "no_plan" };

export type Outcome = "estimated_left" | "not_confirmed" | "shortfall";

export type Interval = {
  date: IsoDate;
  endDate: IsoDate | null; // last day before the following known deposit; null = no following deposit known
  deposits: Deposit[];
  depositsCents: number;
  bills: BillLine[];
  billsCents: number;
  allowances: Allowance[];
  allowancesCents: number | null; // null when the month cannot be shared (no deposit weight)
  afterSpendingCents: number; // deposits - bills - allowances (before plan steps)
  steps: StepLine[];
  stepsCents: number | null;
  resultCents: number; // provisional amount left over (>= 0) or shortfall (< 0)
  outcome: Outcome;
  uncertainties: Uncertainty[];
  monthNote: { month: IsoDate; deposits: number; passed: number } | null;
};

export type Reconciliation = {
  sourceId: string;
  sourceName: string;
  frequency: PayFrequency;
  depositCents: number;
  equivalentCents: number | null; // null for irregular
  monthlyCents: number; // income_sources.monthly_amount, the plan's authority
  rule: string;
  matches: boolean | null; // null when not comparable (irregular)
};

export type UnsharedMonth = { month: IsoDate; stepsCents: number; allowancesCents: number; reason: "no_deposits" | "zero_deposits" };
export type ExtraPaycheckMonth = { month: IsoDate; source: string; count: number };

export type PaycheckPlan = {
  today: IsoDate;
  horizonEnd: IsoDate;
  hasSchedules: boolean;
  prePayday: { bills: BillLine[]; totalCents: number; until: IsoDate | null };
  intervals: Interval[];
  reconciliation: Reconciliation[];
  unscheduledIncome: Array<{ name: string; monthlyCents: number }>;
  inactiveScheduled: string[];
  passedIrregular: string[];
  unsharedMonths: UnsharedMonth[];
  extraPaycheckMonths: ExtraPaycheckMonth[];
  planAvailable: boolean;
  globalUncertainties: Uncertainty[];
};

const ALLOWANCE_LABEL: Record<AllowanceKey, string> = {
  required: "Required spending without a due date (monthly average)",
  discretionary: "Flexible spending (monthly average)",
  debt: "Debt minimums without a due date (monthly average)",
};

function total(values: number[]): number {
  const out = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(out)) throw new RangeError("Amount out of range");
  return out;
}

const monthOf = (date: IsoDate) => date.slice(0, 7);

export function buildPaycheckPlan(input: PaycheckPlanInput): PaycheckPlan {
  const { today } = input;
  const horizonEnd = addDays(today, HORIZON_DAYS - 1);
  const incomes = new Map(input.incomes.map((income) => [income.id, income]));

  // ---- Schedules -> expected deposits ----------------------------------------------------------------------------
  const active: Array<{ schedule: PaySchedule; income: IncomeFact }> = [];
  const inactiveScheduled: string[] = [];
  const passedIrregular: string[] = [];
  for (const schedule of input.schedules) {
    const income = incomes.get(schedule.incomeSourceId);
    if (!income) throw new PaycheckDataError("Schedule without its income source");
    if (scheduleShapeError(schedule) !== null) throw new PaycheckDataError("Invalid schedule");
    if (!income.isActive) inactiveScheduled.push(income.name);
    else {
      active.push({ schedule, income });
      if (schedule.frequency === "irregular" && schedule.nextDate < today) passedIrregular.push(income.name);
    }
  }
  const generateFrom = monthStart(today);
  const generateTo = monthEnd(addDays(horizonEnd, LOOKAHEAD_DAYS));
  const all: Deposit[] = [];
  for (const { schedule, income } of active) {
    depositDates(schedule, generateFrom, generateTo).forEach((date, index, dates) => {
      const nth = dates.slice(0, index).filter((d) => d === date).length; // two deposits on one clamped day stay distinct
      all.push({ key: `${date}|${income.id}|${nth}`, date, sourceId: income.id, sourceName: income.name, ownerName: income.ownerName,
        frequency: schedule.frequency, cents: schedule.depositCents, variable: income.isVariable });
    });
  }
  // Stable order: date, then source identity (the tie-break for apportionment remainders), then occurrence.
  all.sort((a, b) => (a.date === b.date ? (a.sourceId === b.sourceId ? a.key.localeCompare(b.key) : a.sourceId < b.sourceId ? -1 : 1) : a.date < b.date ? -1 : 1));

  // ---- Monthly allowances: ONLY bills without a due date (scheduled ones are counted at their actual dates) ----------
  const allowanceItems: Record<AllowanceKey, Array<{ name: string; cents: number }>> = { required: [], discretionary: [], debt: [] };
  for (const bill of input.bills) {
    if (bill.anchor !== null) continue;
    const cents = monthlyEquivalentCents(bill.paymentCents, bill.kind === "debt" ? "monthly" : bill.recurrence);
    if (bill.kind === "debt") allowanceItems.debt.push({ name: bill.name, cents });
    else {
      const treatment = input.expenseTreatment.get(bill.id);
      if (!treatment) throw new PaycheckDataError("Expense missing from the plan snapshot");
      allowanceItems[treatment].push({ name: bill.name, cents });
    }
  }
  const allowanceMonthly = (["required", "discretionary", "debt"] as const).map((key) => ({ key, cents: total(allowanceItems[key].map((i) => i.cents)) }));
  const steps = input.steps ?? [];
  for (const step of steps) if (!Number.isSafeInteger(step.monthlyCents) || step.monthlyCents < 0) throw new PaycheckDataError("Invalid plan step amount");

  // ---- Each calendar month in the window: split its plan steps and allowances over that month's known deposits ------
  type MonthShares = { steps: Map<string, Map<string, number>>; allowances: Map<AllowanceKey, Map<string, number>>; deposits: number; passed: number } | null;
  const monthShares = new Map<string, MonthShares>();
  const unsharedMonths: UnsharedMonth[] = [];
  for (let offset = 0; monthStart(today, offset) <= horizonEnd; offset += 1) {
    const month = monthStart(today, offset);
    const inMonth = all.filter((d) => monthOf(d.date) === monthOf(month));
    const weights = inMonth.map((d) => ({ key: d.key, weight: d.cents }));
    const stepShares = new Map<string, Map<string, number>>();
    const allowanceShares = new Map<AllowanceKey, Map<string, number>>();
    let shareable = true;
    for (const step of steps) {
      const shares = apportionCents(step.monthlyCents, weights);
      if (!shares) { shareable = false; break; }
      stepShares.set(step.id, shares);
    }
    for (const a of allowanceMonthly) {
      if (!shareable) break;
      const shares = apportionCents(a.cents, weights);
      if (!shares) { shareable = false; break; }
      allowanceShares.set(a.key, shares);
    }
    // A month with no deposit weight at all can't carry anything (even when there is nothing to share, say so).
    if (!shareable || weights.every((w) => w.weight === 0)) {
      monthShares.set(monthOf(month), null);
      unsharedMonths.push({ month, stepsCents: total(steps.map((s) => s.monthlyCents)), allowancesCents: total(allowanceMonthly.map((a) => a.cents)),
        reason: inMonth.length ? "zero_deposits" : "no_deposits" });
    } else {
      monthShares.set(monthOf(month), { steps: stepShares, allowances: allowanceShares, deposits: inMonth.length, passed: inMonth.filter((d) => d.date < today).length });
    }
  }

  // ---- Bills ----------------------------------------------------------------------------------------------------
  const setAsideFor = new Map(input.setAsides.map((s) => [`${s.expenseId}|${s.cycleDue}`, s.reservedCents]));
  const scheduledBills = input.bills.filter((b) => b.anchor !== null);
  function billsBetween(from: IsoDate, to: IsoDate, deposit: IsoDate | null): BillLine[] {
    if (to < from) return [];
    return scheduledBills.flatMap((bill) => {
      const recurrence: Recurrence = bill.kind === "debt" ? "monthly" : bill.recurrence;
      return occurrencesBetween(bill.anchor as IsoDate, recurrence, from, to).map((date) => ({
        billId: bill.id, kind: bill.kind, name: bill.name, date, cents: bill.paymentCents, recurrence,
        monthlyCents: monthlyEquivalentCents(bill.paymentCents, recurrence),
        dueOnPayday: deposit !== null && date === deposit,
        nextMonth: deposit !== null && monthOf(date) !== monthOf(deposit),
        setAsideCents: bill.kind === "expense" ? setAsideFor.get(`${bill.id}|${date}`) ?? null : null,
      }));
    }).sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name, "en-US") || a.billId.localeCompare(b.billId) : a.date < b.date ? -1 : 1));
  }

  // ---- Safeguard 2: reconcile each scheduled source with its monthly amount ----------------------------------------
  const reconciliation: Reconciliation[] = active.map(({ schedule, income }) => {
    const equivalentCents = monthlyEquivalentOfDeposit(schedule.depositCents, schedule.frequency);
    return { sourceId: income.id, sourceName: income.name, frequency: schedule.frequency, depositCents: schedule.depositCents, equivalentCents,
      monthlyCents: income.monthlyCents, rule: MONTHLY_EQUIVALENT_RULE[schedule.frequency], matches: equivalentCents === null ? null : equivalentCents === income.monthlyCents };
  });
  const scheduledIds = new Set(active.map((a) => a.income.id));
  const unscheduledIncome = input.incomes.filter((i) => i.isActive && !scheduledIds.has(i.id) && i.monthlyCents > 0).map((i) => ({ name: i.name, monthlyCents: i.monthlyCents }));
  const globalUncertainties: Uncertainty[] = [];
  if (reconciliation.some((r) => r.matches === false)) globalUncertainties.push({ kind: "income_mismatch" });
  if (unscheduledIncome.length) globalUncertainties.push({ kind: "unscheduled_income" });
  if (input.steps === null) globalUncertainties.push({ kind: "no_plan" });

  // ---- Intervals: one per expected deposit date in the next 60 days ------------------------------------------------
  const shown = all.filter((d) => d.date >= today && d.date <= horizonEnd);
  const dates = [...new Set(shown.map((d) => d.date))];
  const intervals: Interval[] = dates.map((date) => {
    const deposits = shown.filter((d) => d.date === date);
    const following = all.find((d) => d.date > date)?.date ?? null;
    const endDate = following ? addDays(following, -1) : null;
    const bills = billsBetween(date, endDate ?? horizonEnd, date);
    const shares = monthShares.get(monthOf(date)) ?? null;
    const depositsCents = total(deposits.map((d) => d.cents));
    const billsCents = total(bills.map((b) => b.cents));
    const shareOf = (map: Map<string, number> | undefined) => total(deposits.map((d) => map?.get(d.key) ?? 0));

    const allowances: Allowance[] = (["required", "discretionary", "debt"] as const)
      .map((key) => ({ key, label: ALLOWANCE_LABEL[key], cents: shares ? shareOf(shares.allowances.get(key)) : 0, items: allowanceItems[key].map((i) => i.name) }))
      .filter((a) => a.cents > 0);
    const allowancesCents = shares ? total(allowances.map((a) => a.cents)) : null;
    const afterSpendingCents = depositsCents - billsCents - (allowancesCents ?? 0);

    // Safeguard 3: the engine's order, each step's share of this paycheck, and how much of it is actually supportable.
    let available = afterSpendingCents;
    const stepLines: StepLine[] = shares ? steps.map((step) => {
      const shareCents = shareOf(shares.steps.get(step.id));
      const supportedCents = Math.max(0, Math.min(shareCents, available));
      available -= shareCents;
      const coverage: StepCoverage = supportedCents >= shareCents ? "covered" : supportedCents > 0 ? "partly" : "not_covered";
      return { id: step.id, rank: step.rank, title: step.title, stateLabel: step.stateLabel, monthlyCents: step.monthlyCents, shareCents, supportedCents, coverage };
    }).filter((line) => line.shareCents > 0) : [];
    const stepsCents = shares ? total(stepLines.map((s) => s.shareCents)) : null;
    const resultCents = afterSpendingCents - (stepsCents ?? 0);

    const uncertainties: Uncertainty[] = [];
    for (const d of deposits) {
      if (d.variable) uncertainties.push({ kind: "variable", source: d.sourceName });
      if (d.frequency === "irregular") uncertainties.push({ kind: "irregular", source: d.sourceName });
      if (d.cents === 0) uncertainties.push({ kind: "zero_deposit", source: d.sourceName });
    }
    if (!endDate) uncertainties.push({ kind: "no_following_deposit", through: horizonEnd });
    if (!shares) uncertainties.push({ kind: "month_unapportioned", month: monthStart(date) });
    uncertainties.push(...globalUncertainties);
    const outcome: Outcome = resultCents < 0 ? "shortfall" : uncertainties.length ? "not_confirmed" : "estimated_left";
    return {
      date, endDate, deposits, depositsCents, bills, billsCents, allowances, allowancesCents, afterSpendingCents,
      steps: stepLines, stepsCents, resultCents, outcome, uncertainties: dedupe(uncertainties),
      monthNote: shares ? { month: monthStart(date), deposits: shares.deposits, passed: shares.passed } : null,
    };
  });

  const firstDate = intervals[0]?.date ?? null;
  const preBills = billsBetween(today, firstDate ? addDays(firstDate, -1) : horizonEnd, null);

  // Three (or five) paychecks in a month: the month's plan amounts are shared, not multiplied.
  const extraPaycheckMonths: ExtraPaycheckMonth[] = [];
  for (const { schedule, income } of active) {
    if (schedule.frequency !== "weekly" && schedule.frequency !== "biweekly") continue;
    const perMonth = new Map<string, number>();
    for (const d of all) if (d.sourceId === income.id && monthOf(d.date) <= monthOf(horizonEnd)) perMonth.set(monthOf(d.date), (perMonth.get(monthOf(d.date)) ?? 0) + 1);
    for (const [month, count] of perMonth) {
      if (count > (schedule.frequency === "weekly" ? 4 : 2)) extraPaycheckMonths.push({ month: `${month}-01`, source: income.name, count });
    }
  }

  return {
    today, horizonEnd, hasSchedules: active.length > 0,
    prePayday: { bills: preBills, totalCents: total(preBills.map((b) => b.cents)), until: firstDate },
    intervals, reconciliation, unscheduledIncome, inactiveScheduled, passedIrregular, unsharedMonths,
    extraPaycheckMonths: extraPaycheckMonths.sort((a, b) => a.month.localeCompare(b.month) || a.source.localeCompare(b.source)),
    planAvailable: input.steps !== null, globalUncertainties,
  };
}

function dedupe(list: Uncertainty[]): Uncertainty[] {
  const seen = new Set<string>();
  return list.filter((u) => {
    const key = JSON.stringify(u);
    return seen.has(key) ? false : (seen.add(key), true);
  });
}
