// FFH-P12 per-paycheck planning (issue #203): the five pay frequencies, date-only month-end/leap-year/year-boundary
// behaviour, the 60-day timeline, actual bills per deposit interval incl. pre-payday, on-payday and cross-month bills
// (safeguard 1), income reconciliation (safeguard 2), exact-cent largest-remainder apportionment of the plan's steps and
// honest shortfalls / unfunded steps (safeguard 3), P11 reserves as context only, the guided-input contract for the
// schedule form, and noninterference with the plan, the Bills view and the Money Priority Engine.
import assert from "node:assert/strict";
import test from "node:test";
import { apportionCents } from "../paychecks/apportion.ts";
import { depositDates, monthlyEquivalentOfDeposit, scheduleShapeError, type PaySchedule } from "../paychecks/schedule.ts";
import { buildPaycheckPlan, PaycheckDataError, type IncomeFact, type PaycheckPlanInput, type PlanStepFact } from "../paychecks/plan.ts";
import { parseScheduleForm } from "../paychecks/form.ts";
import { dollarsToCents, incomeFacts, incomeFingerprint, planSteps, expenseTreatments, assemblePaycheckInput } from "../paychecks/inputs.ts";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { buildBillsView, type BillInput } from "../bills/bills-view.ts";
import { MAX_CENTS } from "../bills/schedule.ts";
import { planFromRaw } from "../plan/plan-result.ts";
import { exampleHouseholdRaw } from "../plan/example-household.ts";

const S1 = "00000000-0000-4000-8000-0000000000a1";
const S2 = "00000000-0000-4000-8000-0000000000a2";
const sched = (over: Partial<PaySchedule> = {}): PaySchedule => ({
  id: "00000000-0000-4000-8000-0000000000f1", incomeSourceId: S1, frequency: "biweekly", depositCents: 200_000,
  nextDate: "2026-12-04", dayOne: null, dayTwo: null, version: 1, ...over,
});
const income = (over: Partial<IncomeFact> = {}): IncomeFact => ({ id: S1, name: "ZZ-Pay A", ownerName: "ZZ-Alex", monthlyCents: 433_333, isActive: true, isVariable: false, ...over });
const bill = (over: Partial<BillInput> = {}): BillInput => ({ kind: "expense", id: "e1", name: "ZZ-Rent", paymentCents: 150_000, recurrence: "monthly", anchor: "2027-01-01", reminder: null, ...over });
const step = (over: Partial<PlanStepFact> = {}): PlanStepFact => ({ id: "s1", rank: 1, title: "Build your emergency fund", stateLabel: "Recommended", monthlyCents: 100_000, ...over });
const input = (over: Partial<PaycheckPlanInput> = {}): PaycheckPlanInput => ({
  today: "2026-11-20", incomes: [income()], schedules: [sched()], bills: [], expenseTreatment: new Map(), steps: [], setAsides: [], ...over,
});

// ---- Frequencies and calendar --------------------------------------------------------------------------------------

test("weekly and biweekly: +7 / +14 calendar days across month and year boundaries; never before the anchor", () => {
  assert.deepEqual(depositDates(sched({ frequency: "weekly", nextDate: "2026-12-24" }), "2026-12-01", "2027-01-14"),
    ["2026-12-24", "2026-12-31", "2027-01-07", "2027-01-14"]);
  assert.deepEqual(depositDates(sched({ frequency: "biweekly", nextDate: "2026-12-25" }), "2027-01-01", "2027-01-31"), ["2027-01-08", "2027-01-22"]);
  assert.deepEqual(depositDates(sched({ frequency: "biweekly", nextDate: "2027-01-08" }), "2026-12-01", "2027-01-07"), []);
});

test("biweekly gives three-paycheck months naturally (Jan 2027: 1, 15, 29)", () => {
  assert.deepEqual(depositDates(sched({ frequency: "biweekly", nextDate: "2027-01-01" }), "2027-01-01", "2027-01-31"), ["2027-01-01", "2027-01-15", "2027-01-29"]);
});

test("date-only arithmetic is unaffected by DST changes (US 2027-03-14, 2027-11-07)", () => {
  assert.deepEqual(depositDates(sched({ frequency: "weekly", nextDate: "2027-03-08" }), "2027-03-01", "2027-03-22"), ["2027-03-08", "2027-03-15", "2027-03-22"]);
  assert.deepEqual(depositDates(sched({ frequency: "weekly", nextDate: "2027-11-01" }), "2027-11-01", "2027-11-15"), ["2027-11-01", "2027-11-08", "2027-11-15"]);
});

test("monthly: the 31st clamps to short months and returns to the 31st (anchor preserved); leap years", () => {
  assert.deepEqual(depositDates(sched({ frequency: "monthly", nextDate: "2027-01-31" }), "2027-01-01", "2027-05-31"),
    ["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]);
  assert.deepEqual(depositDates(sched({ frequency: "monthly", nextDate: "2028-01-30" }), "2028-02-01", "2028-03-31"), ["2028-02-29", "2028-03-30"]);
});

test("semimonthly: two ordered anchors, month-end clamp with restoration; colliding clamps stay two deposits", () => {
  const s = sched({ frequency: "semimonthly", nextDate: "2027-01-15", dayOne: 15, dayTwo: 31 });
  assert.deepEqual(depositDates(s, "2027-01-01", "2027-03-31"), ["2027-01-15", "2027-01-31", "2027-02-15", "2027-02-28", "2027-03-15", "2027-03-31"]);
  const leap = sched({ frequency: "semimonthly", nextDate: "2028-02-15", dayOne: 15, dayTwo: 30 });
  assert.deepEqual(depositDates(leap, "2028-02-01", "2028-02-29"), ["2028-02-15", "2028-02-29"]);
  const clash = sched({ frequency: "semimonthly", nextDate: "2027-01-30", dayOne: 30, dayTwo: 31 });
  assert.deepEqual(depositDates(clash, "2027-02-01", "2027-02-28"), ["2027-02-28", "2027-02-28"]);
});

test("irregular: only the one entered deposit, never repeated", () => {
  const s = sched({ frequency: "irregular", nextDate: "2026-12-10" });
  assert.deepEqual(depositDates(s, "2026-11-01", "2027-06-30"), ["2026-12-10"]);
  assert.deepEqual(depositDates(s, "2026-12-11", "2027-06-30"), []);
});

test("schedule shape rules match the database: anchors only for semimonthly, ordered, next date on a payday", () => {
  assert.equal(scheduleShapeError(sched()), null);
  assert.equal(scheduleShapeError(sched({ dayOne: 1, dayTwo: 15 })), "days_not_allowed");
  assert.equal(scheduleShapeError(sched({ frequency: "semimonthly", dayOne: null, dayTwo: null })), "days_missing");
  assert.equal(scheduleShapeError(sched({ frequency: "semimonthly", nextDate: "2027-01-15", dayOne: 15, dayTwo: 15 })), "days_invalid");
  assert.equal(scheduleShapeError(sched({ frequency: "semimonthly", nextDate: "2027-01-15", dayOne: 20, dayTwo: 15 })), "days_invalid");
  assert.equal(scheduleShapeError(sched({ frequency: "semimonthly", nextDate: "2027-01-16", dayOne: 15, dayTwo: 31 })), "date_not_payday");
  assert.equal(scheduleShapeError(sched({ frequency: "semimonthly", nextDate: "2027-02-28", dayOne: 15, dayTwo: 31 })), null);
  assert.equal(scheduleShapeError(sched({ depositCents: -1 })), "amount_invalid");
  assert.equal(scheduleShapeError(sched({ depositCents: 1.5 })), "amount_invalid");
  assert.equal(scheduleShapeError(sched({ depositCents: Number.NaN })), "amount_invalid");
  assert.equal(scheduleShapeError(sched({ depositCents: MAX_CENTS + 1 })), "amount_invalid");
});

// ---- Safeguard 2: monthly equivalents, for comparison only -------------------------------------------------------

test("monthly equivalent: 52/12, 26/12, 2x, 1x in exact cents (half up); irregular is not comparable", () => {
  assert.equal(monthlyEquivalentOfDeposit(100_000, "weekly"), 433_333); // 4333.333...
  assert.equal(monthlyEquivalentOfDeposit(200_000, "biweekly"), 433_333);
  assert.equal(monthlyEquivalentOfDeposit(1, "biweekly"), 2); // 2.1666 -> 2
  assert.equal(monthlyEquivalentOfDeposit(3, "weekly"), 13); // 13.0
  assert.equal(monthlyEquivalentOfDeposit(150_000, "semimonthly"), 300_000);
  assert.equal(monthlyEquivalentOfDeposit(150_000, "monthly"), 150_000);
  assert.equal(monthlyEquivalentOfDeposit(150_000, "irregular"), null);
  assert.equal(monthlyEquivalentOfDeposit(MAX_CENTS, "weekly"), 433_333_333_333_329);
});

test("income mismatch is disclosed, never overwritten, and blocks a confident positive remainder", () => {
  const ok = buildPaycheckPlan(input());
  assert.equal(ok.reconciliation[0].matches, true);
  assert.equal(ok.intervals[0].outcome, "estimated_left");
  const off = buildPaycheckPlan(input({ incomes: [income({ monthlyCents: 400_000 })] }));
  assert.deepEqual({ ...off.reconciliation[0], sourceId: undefined }, { sourceId: undefined, sourceName: "ZZ-Pay A", frequency: "biweekly", depositCents: 200_000,
    equivalentCents: 433_333, monthlyCents: 400_000, rule: "26 deposits a year ÷ 12", matches: false });
  assert.ok(off.intervals.every((i) => i.outcome !== "estimated_left"));
  assert.ok(off.intervals[0].uncertainties.some((u) => u.kind === "income_mismatch"));
  // The deposits themselves stay the typed amount.
  assert.equal(off.intervals[0].depositsCents, 200_000);
});

test("an active income without a schedule and a plan that can't run both prevent confident conclusions", () => {
  const plan = buildPaycheckPlan(input({ incomes: [income(), income({ id: S2, name: "ZZ-Pay B", monthlyCents: 50_000 })] }));
  assert.deepEqual(plan.unscheduledIncome, [{ name: "ZZ-Pay B", monthlyCents: 50_000 }]);
  assert.ok(plan.intervals.every((i) => i.outcome === "not_confirmed"));
  const noPlan = buildPaycheckPlan(input({ steps: null }));
  assert.equal(noPlan.planAvailable, false);
  assert.ok(noPlan.intervals.every((i) => i.uncertainties.some((u) => u.kind === "no_plan")));
});

// ---- Exact-cent apportionment -----------------------------------------------------------------------------------

test("largest remainder: exact sum, floor then remainders, deterministic ties by caller order", () => {
  assert.deepEqual([...apportionCents(100, [{ key: "a", weight: 1 }, { key: "b", weight: 1 }, { key: "c", weight: 1 }])!], [["a", 34], ["b", 33], ["c", 33]]);
  assert.deepEqual([...apportionCents(100, [{ key: "c", weight: 1 }, { key: "a", weight: 1 }, { key: "b", weight: 1 }])!], [["c", 34], ["a", 33], ["b", 33]]);
  assert.deepEqual([...apportionCents(1001, [{ key: "a", weight: 200_000 }, { key: "b", weight: 100_000 }])!], [["a", 667], ["b", 334]]);
  assert.deepEqual([...apportionCents(5, [{ key: "a", weight: 0 }, { key: "b", weight: 7 }])!], [["a", 0], ["b", 5]]);
  assert.equal(apportionCents(5, [{ key: "a", weight: 0 }]), null);
  assert.equal(apportionCents(5, []), null);
  assert.throws(() => apportionCents(-1, [{ key: "a", weight: 1 }]), RangeError);
  assert.throws(() => apportionCents(1.5, [{ key: "a", weight: 1 }]), RangeError);
  assert.throws(() => apportionCents(1, [{ key: "a", weight: Number.NaN }]), RangeError);
  assert.throws(() => apportionCents(1, [{ key: "a", weight: 1 }, { key: "a", weight: 1 }]), RangeError);
});

test("apportionment never drifts at extreme magnitudes (BigInt) and always sums exactly", () => {
  const big = apportionCents(MAX_CENTS, [{ key: "a", weight: MAX_CENTS }, { key: "b", weight: MAX_CENTS - 1 }, { key: "c", weight: 3 }])!;
  assert.equal([...big.values()].reduce((a, b) => a + b, 0), MAX_CENTS);
  let seed = 7;
  const rand = () => (seed = (seed * 48271) % 2147483647);
  for (let trial = 0; trial < 500; trial += 1) {
    const parts = Array.from({ length: 1 + (rand() % 5) }, (_, i) => ({ key: `k${i}`, weight: rand() % 500_000 }));
    const amount = rand() % 10_000_000;
    const shares = apportionCents(amount, parts);
    if (parts.every((p) => p.weight === 0)) assert.equal(shares, null);
    else {
      assert.equal([...shares!.values()].reduce((a, b) => a + b, 0), amount);
      for (const p of parts) assert.ok(Math.abs(shares!.get(p.key)! - (amount * p.weight) / parts.reduce((s, q) => s + q.weight, 0)) < 1);
    }
  }
});

// ---- Timeline and safeguard 1 (bills) -----------------------------------------------------------------------------

test("60-day window, chronological; same-day deposits share one interval and keep each source", () => {
  const plan = buildPaycheckPlan(input({
    incomes: [income({ monthlyCents: 433_333 }), income({ id: S2, name: "ZZ-Pay B", ownerName: "ZZ-Blake", monthlyCents: 300_000 })],
    schedules: [sched(), sched({ id: "f2", incomeSourceId: S2, frequency: "semimonthly", nextDate: "2026-12-15", dayOne: 1, dayTwo: 15, depositCents: 150_000 })],
  }));
  assert.equal(plan.horizonEnd, "2027-01-18");
  assert.deepEqual(plan.intervals.map((i) => i.date), ["2026-12-04", "2026-12-15", "2026-12-18", "2027-01-01", "2027-01-15"]);
  assert.deepEqual(plan.intervals[3].deposits.map((d) => d.sourceName), ["ZZ-Pay A", "ZZ-Pay B"], "Jan 1: both sources, never before an anchor");
  const shared = buildPaycheckPlan(input({
    incomes: [income(), income({ id: S2, name: "ZZ-Pay B", monthlyCents: 433_333 })],
    schedules: [sched(), sched({ id: "f2", incomeSourceId: S2 })],
  }));
  assert.deepEqual(shared.intervals[0].deposits.map((d) => [d.sourceName, d.cents]), [["ZZ-Pay A", 200_000], ["ZZ-Pay B", 200_000]]);
  assert.equal(shared.intervals[0].depositsCents, 400_000);
});

test("SAFEGUARD 1: Dec 26 paycheck carries Jan 1 rent when the following deposit is Jan 9 (cross-month)", () => {
  const plan = buildPaycheckPlan(input({ today: "2026-12-20", schedules: [sched({ nextDate: "2026-12-26" })], incomes: [income()], bills: [bill()] }));
  const dec26 = plan.intervals[0];
  assert.equal(dec26.date, "2026-12-26");
  assert.equal(dec26.endDate, "2027-01-08");
  assert.deepEqual(dec26.bills.map((b) => [b.name, b.date, b.cents, b.nextMonth]), [["ZZ-Rent", "2027-01-01", 150_000, true]]);
  assert.equal(dec26.billsCents, 150_000);
  assert.equal(plan.intervals[1].bills.length, 0, "the Jan 9 paycheck doesn't count it again");
});

test("bills before the first expected deposit are shown separately and not charged to any paycheck", () => {
  const plan = buildPaycheckPlan(input({ today: "2026-11-28", bills: [bill({ anchor: "2026-12-01" }), bill({ id: "e2", name: "ZZ-Phone", paymentCents: 8_000, anchor: "2026-12-04" })] }));
  assert.equal(plan.prePayday.until, "2026-12-04");
  assert.deepEqual(plan.prePayday.bills.map((b) => b.name), ["ZZ-Rent"]);
  assert.equal(plan.prePayday.totalCents, 150_000);
  assert.deepEqual(plan.intervals[0].bills.map((b) => [b.name, b.dueOnPayday]), [["ZZ-Phone", true]]);
});

test("no schedule: every bill in the window is pre-payday and there are no intervals", () => {
  const plan = buildPaycheckPlan(input({ schedules: [], bills: [bill({ anchor: "2026-12-01" })] }));
  assert.equal(plan.hasSchedules, false);
  assert.equal(plan.intervals.length, 0);
  assert.equal(plan.prePayday.until, null);
  assert.deepEqual(plan.prePayday.bills.map((b) => b.date), ["2026-12-01", "2027-01-01"]);
});

test("quarterly/yearly bills count at their actual amount when due; their monthly equivalent is never added", () => {
  const insurance = bill({ id: "e9", name: "ZZ-Insurance", paymentCents: 120_000, recurrence: "yearly", anchor: "2026-12-10" });
  const plan = buildPaycheckPlan(input({ bills: [insurance], expenseTreatment: new Map([["e9", "required"]]) }));
  const dec4 = plan.intervals.find((i) => i.date === "2026-12-04")!;
  assert.deepEqual(dec4.bills.map((b) => [b.cents, b.monthlyCents]), [[120_000, 10_000]]);
  assert.equal(dec4.allowancesCents, 0);
  for (const i of plan.intervals) if (i.date !== "2026-12-04") assert.equal(i.billsCents, 0);
});

test("unscheduled expenses and debt minimums become monthly allowances, split once across the month's deposits", () => {
  const plan = buildPaycheckPlan(input({
    bills: [
      bill({ id: "g", name: "ZZ-Groceries", paymentCents: 60_001, anchor: null }),
      bill({ id: "f", name: "ZZ-Fun", paymentCents: 20_000, anchor: null }),
      bill({ kind: "debt", id: "d", name: "ZZ-Card", paymentCents: 5_000, anchor: null }),
    ],
    expenseTreatment: new Map([["g", "required"], ["f", "discretionary"]]),
  }));
  // December 2026 has deposits on Dec 4 and Dec 18 (equal weights): 60,001 -> 30,001 + 30,000.
  const dec = plan.intervals.filter((i) => i.date.startsWith("2026-12"));
  assert.deepEqual(dec.map((i) => i.allowances.map((a) => [a.key, a.cents])), [
    [["required", 30_001], ["discretionary", 10_000], ["debt", 2_500]],
    [["required", 30_000], ["discretionary", 10_000], ["debt", 2_500]],
  ]);
  assert.equal(dec.reduce((s, i) => s + (i.allowancesCents ?? 0), 0), 60_001 + 20_000 + 5_000);
  assert.throws(() => buildPaycheckPlan(input({ bills: [bill({ id: "x", anchor: null })] })), PaycheckDataError);
});

// ---- Safeguard 3: the plan's steps, exact cents, honest shortfalls -----------------------------------------------

test("plan steps are split over the month's deposits by amount and sum exactly to the monthly step", () => {
  const plan = buildPaycheckPlan(input({
    today: "2027-01-01", schedules: [sched({ nextDate: "2027-01-01", depositCents: 200_000 })],
    steps: [step({ monthlyCents: 100_001 }), step({ id: "s2", rank: 2, title: "Extra debt payment", monthlyCents: 3 })],
  }));
  const jan = plan.intervals.filter((i) => i.date.startsWith("2027-01"));
  assert.equal(jan.length, 3, "three-paycheck month");
  assert.deepEqual(jan.map((i) => i.steps.map((s) => s.shareCents)), [[33_334, 1], [33_334, 1], [33_333, 1]]);
  assert.equal(jan.reduce((sum, i) => sum + i.steps[0].shareCents, 0), 100_001, "redistributed, not multiplied");
  assert.equal(plan.extraPaycheckMonths[0].month, "2027-01-01");
  assert.equal(plan.extraPaycheckMonths[0].count, 3);
  assert.deepEqual(jan[0].steps.map((s) => s.rank), [1, 2], "engine order kept");
});

test("deposits weighted by amount: a bigger paycheck carries a bigger share; past deposits in the month keep theirs", () => {
  const plan = buildPaycheckPlan(input({
    today: "2026-12-10",
    incomes: [income(), income({ id: S2, name: "ZZ-Pay B", monthlyCents: 100_000 })],
    schedules: [sched({ nextDate: "2026-12-04" }), sched({ id: "f2", incomeSourceId: S2, frequency: "monthly", nextDate: "2026-12-20", depositCents: 100_000 })],
    steps: [step({ monthlyCents: 50_000 })],
  }));
  // December weights: Dec 4 (past) 200,000; Dec 18 200,000; Dec 20 100,000 -> 20,000 / 20,000 / 10,000.
  assert.deepEqual(plan.intervals.filter((i) => i.date.startsWith("2026-12")).map((i) => [i.date, i.steps[0].shareCents]), [["2026-12-18", 20_000], ["2026-12-20", 10_000]]);
  assert.deepEqual(plan.intervals[0].monthNote, { month: "2026-12-01", deposits: 3, passed: 1 });
});

test("when bills exhaust a paycheck: negative result, steps not covered in canonical order, nothing invented", () => {
  const plan = buildPaycheckPlan(input({
    today: "2026-12-20", schedules: [sched({ nextDate: "2026-12-26", depositCents: 200_000 })],
    bills: [bill({ paymentCents: 190_000 })],
    steps: [step({ monthlyCents: 40_000 }), step({ id: "s2", rank: 2, title: "Invest", monthlyCents: 20_000 })],
  }));
  const dec26 = plan.intervals[0];
  // December has one deposit (Dec 26): it carries the whole December step amounts.
  assert.equal(dec26.afterSpendingCents, 10_000);
  assert.deepEqual(dec26.steps.map((s) => [s.rank, s.shareCents, s.supportedCents, s.coverage]), [[1, 40_000, 10_000, "partly"], [2, 20_000, 0, "not_covered"]]);
  assert.equal(dec26.resultCents, -50_000);
  assert.equal(dec26.outcome, "shortfall");
  // A later, roomier paycheck does not erase it.
  assert.equal(plan.intervals[1].outcome, "estimated_left");
  assert.equal(plan.intervals[0].resultCents, -50_000);
});

test("bills alone exceeding a deposit: shortfall before any step, all steps not covered", () => {
  const plan = buildPaycheckPlan(input({ today: "2026-12-20", schedules: [sched({ nextDate: "2026-12-26", depositCents: 100_000 })], bills: [bill()], steps: [step()] }));
  assert.equal(plan.intervals[0].afterSpendingCents, -50_000);
  assert.deepEqual(plan.intervals[0].steps.map((s) => s.coverage), ["not_covered"]);
  assert.equal(plan.intervals[0].resultCents, -150_000);
});

test("a month without any expected deposit can't carry its steps: disclosed, never funded from elsewhere", () => {
  const plan = buildPaycheckPlan(input({ schedules: [sched({ frequency: "irregular", nextDate: "2026-12-10" })], incomes: [income({ monthlyCents: 0 })], steps: [step()] }));
  assert.deepEqual(plan.unsharedMonths.map((m) => [m.month, m.reason, m.stepsCents]), [["2026-11-01", "no_deposits", 100_000], ["2027-01-01", "no_deposits", 100_000]]);
  const dec10 = plan.intervals[0];
  assert.equal(dec10.endDate, null);
  assert.ok(dec10.uncertainties.some((u) => u.kind === "irregular"));
  assert.ok(dec10.uncertainties.some((u) => u.kind === "no_following_deposit"));
  assert.equal(dec10.outcome, "not_confirmed");
});

test("explicit $0 deposits are valid facts but can't carry shares or support a positive conclusion", () => {
  const plan = buildPaycheckPlan(input({ schedules: [sched({ depositCents: 0 })], incomes: [income({ monthlyCents: 0 })], steps: [step()] }));
  assert.ok(plan.unsharedMonths.some((m) => m.reason === "zero_deposits"));
  assert.ok(plan.intervals.every((i) => i.outcome !== "estimated_left" && i.stepsCents === null && i.allowancesCents === null));
  assert.ok(plan.intervals[0].uncertainties.some((u) => u.kind === "zero_deposit"));
});

test("variable income: estimates only, never a confident remainder", () => {
  const plan = buildPaycheckPlan(input({ incomes: [income({ isVariable: true })] }));
  assert.ok(plan.intervals.every((i) => i.outcome === "not_confirmed" && i.uncertainties.some((u) => u.kind === "variable")));
});

test("inactive income schedules and passed irregular dates are reported, not projected", () => {
  const plan = buildPaycheckPlan(input({ incomes: [income({ isActive: false })] }));
  assert.deepEqual(plan.inactiveScheduled, ["ZZ-Pay A"]);
  assert.equal(plan.intervals.length, 0);
  const passed = buildPaycheckPlan(input({ schedules: [sched({ frequency: "irregular", nextDate: "2026-11-05" })], incomes: [income({ monthlyCents: 0 })] }));
  assert.deepEqual(passed.passedIrregular, ["ZZ-Pay A"]);
  assert.equal(passed.intervals.length, 0);
  assert.throws(() => buildPaycheckPlan(input({ incomes: [] })), PaycheckDataError);
});

// ---- P11 context and no double counting -------------------------------------------------------------------------

test("P11 reported set-aside is shown next to the due bill only; the bill still counts in full", () => {
  const insurance = bill({ id: "e9", name: "ZZ-Insurance", paymentCents: 120_000, recurrence: "yearly", anchor: "2026-12-10" });
  const base = input({ bills: [insurance], expenseTreatment: new Map([["e9", "required"]]) });
  const without = buildPaycheckPlan(base);
  const withReserve = buildPaycheckPlan({ ...base, setAsides: [{ expenseId: "e9", cycleDue: "2026-12-10", reservedCents: 90_000 }] });
  const line = withReserve.intervals.find((i) => i.date === "2026-12-04")!.bills[0];
  assert.equal(line.setAsideCents, 90_000);
  assert.equal(line.cents, 120_000);
  const strip = (p: ReturnType<typeof buildPaycheckPlan>) => JSON.stringify(p, (k, v) => (k === "setAsideCents" ? undefined : v));
  assert.equal(strip(withReserve), strip(without), "nothing but the context line changes");
});

test("total outflow per month = plan's monthly outflow: scheduled actuals + unscheduled allowances, nothing twice", () => {
  // A monthly scheduled bill + an unscheduled one; over a whole calendar month the timeline charges each exactly once.
  const plan = buildPaycheckPlan(input({
    today: "2027-01-01", schedules: [sched({ nextDate: "2027-01-01" })],
    bills: [bill({ anchor: "2027-01-05" }), bill({ id: "g", name: "ZZ-Groceries", paymentCents: 60_000, anchor: null })],
    expenseTreatment: new Map([["e1", "required"], ["g", "required"]]),
  }));
  const jan = plan.intervals.filter((i) => i.date.startsWith("2027-01"));
  const charged = plan.intervals.flatMap((i) => i.bills.map((b) => b.date));
  assert.deepEqual(charged, ["2027-01-05", "2027-02-05", "2027-03-05"], "each due date charged to exactly one paycheck (Feb 5 by Jan 29, Mar 5 by Feb 26)");
  assert.equal(plan.intervals.find((i) => i.date === "2027-01-29")!.bills[0].nextMonth, true);
  assert.equal(jan.reduce((s, i) => s + (i.allowancesCents ?? 0), 0), 60_000);
});

// ---- Guided input -----------------------------------------------------------------------------------------------

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const good = { frequency: "biweekly", amount: "2000", next_date: "2026-12-04", net_confirm: "yes" };

test("form: nothing pre-answered; blank is missing (never $0); typed 0 is accepted; net pay must be confirmed", () => {
  const today = "2026-11-20";
  assert.deepEqual(parseScheduleForm(form({ ...good, frequency: "" }), today), { ok: false, error: "frequency_missing" });
  assert.deepEqual(parseScheduleForm(form({ ...good, frequency: "fortnightly" }), today), { ok: false, error: "frequency_missing" });
  assert.deepEqual(parseScheduleForm(form({ ...good, amount: "" }), today), { ok: false, error: "amount_missing" });
  assert.deepEqual(parseScheduleForm(form({ ...good, amount: "   " }), today), { ok: false, error: "amount_missing" });
  for (const bad of ["12.345", "-5", "NaN", "Infinity", "1e3", "abc", "1000000000000"]) {
    assert.deepEqual(parseScheduleForm(form({ ...good, amount: bad }), today), { ok: false, error: "amount_invalid" }, bad);
  }
  assert.deepEqual(parseScheduleForm(form({ ...good, amount: "0" }), today), { ok: true, value: { frequency: "biweekly", depositCents: 0, nextDate: "2026-12-04", dayOne: null, dayTwo: null } });
  assert.deepEqual(parseScheduleForm(form({ ...good, net_confirm: "" }), today), { ok: false, error: "net_confirm_missing" });
  const noConfirm = form(good);
  noConfirm.delete("net_confirm");
  assert.deepEqual(parseScheduleForm(noConfirm, today), { ok: false, error: "net_confirm_missing" });
});

test("form: dates (missing, invalid, past, far) and semimonthly days", () => {
  const today = "2026-11-20";
  assert.deepEqual(parseScheduleForm(form({ ...good, next_date: "" }), today), { ok: false, error: "date_missing" });
  assert.deepEqual(parseScheduleForm(form({ ...good, next_date: "2026-02-30" }), today), { ok: false, error: "date_invalid" });
  assert.deepEqual(parseScheduleForm(form({ ...good, next_date: "2026-11-18" }), today), { ok: false, error: "date_past" });
  assert.equal(parseScheduleForm(form({ ...good, next_date: "2026-11-19" }), today).ok, true, "yesterday UTC allowed");
  assert.deepEqual(parseScheduleForm(form({ ...good, next_date: "2027-11-22" }), today), { ok: false, error: "date_far" });
  const semi = { ...good, frequency: "semimonthly", next_date: "2026-11-30" };
  assert.deepEqual(parseScheduleForm(form(semi), today), { ok: false, error: "days_missing" });
  assert.deepEqual(parseScheduleForm(form({ ...semi, day_one: "15", day_two: "" }), today), { ok: false, error: "days_missing" });
  assert.deepEqual(parseScheduleForm(form({ ...semi, day_one: "15", day_two: "32" }), today), { ok: false, error: "days_invalid" });
  assert.deepEqual(parseScheduleForm(form({ ...semi, day_one: "31", day_two: "15" }), today), { ok: false, error: "days_invalid" });
  assert.deepEqual(parseScheduleForm(form({ ...semi, day_one: "1", day_two: "15" }), today), { ok: false, error: "date_not_payday" });
  assert.deepEqual(parseScheduleForm(form({ ...semi, day_one: "15", day_two: "31" }), today),
    { ok: true, value: { frequency: "semimonthly", depositCents: 200_000, nextDate: "2026-11-30", dayOne: 15, dayTwo: 31 } });
  // Days sent with another frequency are ignored, not saved.
  assert.deepEqual(parseScheduleForm(form({ ...good, day_one: "1", day_two: "15" }), today).ok, true);
});

// ---- Noninterference --------------------------------------------------------------------------------------------

test("building a paycheck plan never changes the Money Priority Engine result or the Bills view", () => {
  const raw = exampleHouseholdRaw();
  const before = JSON.stringify(planFromRaw(raw, "2026-11-20"));
  const bills = [bill(), bill({ id: "g", name: "ZZ-Groceries", paymentCents: 60_000, anchor: null })];
  const billsBefore = JSON.stringify(buildBillsView(bills, "2026-11-20"));
  const plan = planFromRaw(raw, "2026-11-20");
  assert.ok(plan.ok);
  const steps = plan.view.steps.filter((s) => (s.monthlyAmount ?? 0) > 0).map((s) => ({ id: s.id, rank: s.rank, title: s.title, stateLabel: s.stateLabel, monthlyCents: Math.round(s.monthlyAmount! * 100) }));
  const inputs = input({ bills, steps, expenseTreatment: new Map([["e1", "required"], ["g", "required"]]) });
  const frozen = JSON.stringify(inputs, (_, v) => (v instanceof Map ? [...v] : v));
  buildPaycheckPlan(inputs);
  assert.equal(JSON.stringify(planFromRaw(raw, "2026-11-20")), before);
  assert.equal(JSON.stringify(buildBillsView(bills, "2026-11-20")), billsBefore);
  assert.equal(JSON.stringify(inputs, (_, v) => (v instanceof Map ? [...v] : v)), frozen, "inputs not mutated");
});

// ---- Inputs come from the engine and snapshot unchanged ------------------------------------------------------------

test("plan steps passed to the paycheck plan are exactly Your plan's steps: same ids, order and cent amounts", () => {
  const plan = planFromRaw(exampleHouseholdRaw(), "2026-11-20");
  assert.ok(plan.ok);
  const steps = planSteps(plan)!;
  const expected = plan.view.steps.filter((s) => (s.monthlyAmount ?? 0) > 0);
  assert.ok(steps.length > 0);
  assert.deepEqual(steps.map((s) => [s.id, s.rank, s.monthlyCents]), expected.map((s) => [s.id, s.rank, Math.round(s.monthlyAmount! * 100)]));
  assert.ok(steps.every((s, i) => i === 0 || steps[i - 1].rank < s.rank), "engine rank order");
  assert.equal(planSteps({ ok: false, reason: "x" }), null);
});

test("income facts and spending treatments are copied from the snapshot without changing it", () => {
  const snapshot = buildMoneyPrioritySnapshot(exampleHouseholdRaw());
  const before = JSON.stringify(snapshot);
  const facts = incomeFacts(snapshot);
  assert.deepEqual(facts.map((f) => f.monthlyCents), snapshot.income.map((i) => Math.round(i.monthlyTakeHomeAmount * 100)));
  const treatments = expenseTreatments(snapshot);
  for (const e of snapshot.expenses) assert.equal(treatments.get(e.id), e.cashFlowTreatment === "required" ? "required" : "discretionary");
  const plan = planFromRaw(exampleHouseholdRaw(), "2026-11-20");
  const input = assemblePaycheckInput({ today: "2026-11-20", snapshot, plan, bills: [], schedules: [], setAsides: [] });
  assert.equal(input.incomes.length, snapshot.income.length);
  assert.equal(JSON.stringify(snapshot), before, "snapshot untouched");
});

test("engine dollars -> cents is exact and fails closed; income fingerprint changes with any income fact", () => {
  assert.equal(dollarsToCents(1234.56), 123_456);
  assert.equal(dollarsToCents(0.1 + 0.2), 30);
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.005, 1e13]) assert.throws(() => dollarsToCents(bad), PaycheckDataError, String(bad));
  const base = income();
  const fp = incomeFingerprint(base);
  assert.match(fp, /^[0-9a-f]{32}$/);
  for (const changed of [{ monthlyCents: 433_334 }, { isActive: false }, { isVariable: true }, { name: "ZZ-Other" }]) assert.notEqual(incomeFingerprint({ ...base, ...changed }), fp);
});
