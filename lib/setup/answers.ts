import { amount, percent } from "../forms/validate.ts";

// FFH-P05 guided setup answers. Same validation as the Financial profile forms; any
// invalid answer throws, so nothing is saved from a bad form. A debt is recorded only
// when a balance above zero is given, and then its monthly minimum is required.
export type SetupAnswers = {
  takeHome: number;
  fixedBills: number;
  otherSpending: number;
  debt: { balance: number; minimum: number; rate: number | null } | null;
  savings: number | null;
  simpleView: boolean;
};

export function parseSetupAnswers(formData: FormData): SetupAnswers {
  const takeHome = amount(formData, "take_home") as number;
  const fixedBills = amount(formData, "fixed_bills") as number;
  const otherSpending = amount(formData, "other_spending") as number;
  const debtBalance = amount(formData, "debt_balance", { required: false });
  const debt = debtBalance !== null && debtBalance > 0
    ? { balance: debtBalance, minimum: amount(formData, "debt_minimum") as number, rate: percent(formData, "debt_rate") }
    : null;
  return {
    takeHome,
    fixedBills,
    otherSpending,
    debt,
    savings: amount(formData, "savings", { required: false }),
    simpleView: formData.get("simple_view") === "on",
  };
}
