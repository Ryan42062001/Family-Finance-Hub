import { amount, percent } from "../forms/validate.ts";

// FFH-P05 guided setup answers. Same validation as the Financial profile forms, applied
// to every field that is filled in; any invalid answer throws, so nothing is saved from a
// bad form. The database function validates everything again.
//
// Savings are recorded only with an explicit purpose (Ryan, 2026-11-13). "Not sure" means
// the savings are not saved yet, so the plan never treats unclassified money as free.
export const SAVINGS_PURPOSES = ["protected_reserve", "unallocated", "operating_cash"] as const;
export type SavingsPurpose = (typeof SAVINGS_PURPOSES)[number];

export type SetupAnswers = {
  takeHome: number;
  fixedBills: number;
  otherSpending: number;
  debt: { balance: number; minimum: number; rate: number | null } | null;
  savings: { amount: number; purpose: SavingsPurpose } | null;
  savingsSkippedAsUnsure: boolean;
  simpleView: boolean;
};

export class SetupAnswerError extends Error {}

const fail = (message: string): never => { throw new SetupAnswerError(message); };

export function parseSetupAnswers(formData: FormData): SetupAnswers {
  const takeHome = amount(formData, "take_home") as number;
  const fixedBills = amount(formData, "fixed_bills") as number;
  const otherSpending = amount(formData, "other_spending") as number;

  // Debt: every filled-in field is validated; details without a balance are rejected.
  const debtBalance = amount(formData, "debt_balance", { required: false });
  const debtMinimum = amount(formData, "debt_minimum", { required: false });
  const debtRate = percent(formData, "debt_rate");
  let debt: SetupAnswers["debt"] = null;
  if (debtBalance !== null && debtBalance > 0) {
    if (debtMinimum === null) fail("A debt needs its total monthly minimum payment.");
    debt = { balance: debtBalance, minimum: debtMinimum as number, rate: debtRate };
  } else if (debtMinimum !== null || debtRate !== null) {
    fail("Debt payment or rate was entered without a debt balance.");
  }

  // Savings: an amount needs a chosen purpose; "not_sure" saves nothing.
  const savingsAmount = amount(formData, "savings", { required: false });
  const rawPurpose = String(formData.get("savings_purpose") ?? "").trim();
  if (rawPurpose && rawPurpose !== "not_sure" && !(SAVINGS_PURPOSES as readonly string[]).includes(rawPurpose)) fail("Unknown savings purpose.");
  let savings: SetupAnswers["savings"] = null;
  let savingsSkippedAsUnsure = false;
  if (savingsAmount !== null && savingsAmount > 0) {
    if (!rawPurpose) fail("Tell us what your savings are for, or choose Not sure.");
    if (rawPurpose === "not_sure") savingsSkippedAsUnsure = true;
    else savings = { amount: savingsAmount, purpose: rawPurpose as SavingsPurpose };
  }

  // The switch is either absent (off) or exactly "on".
  const rawSimple = formData.get("simple_view");
  if (rawSimple !== null && rawSimple !== "on") fail("Unknown Simple view value.");

  return { takeHome, fixedBills, otherSpending, debt, savings, savingsSkippedAsUnsure, simpleView: rawSimple === "on" };
}
