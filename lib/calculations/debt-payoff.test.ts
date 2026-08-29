import assert from "node:assert/strict";
import test from "node:test";
import { compareDebtExtraPayment, projectDebtPayoff, projectDebtStrategy } from "./debt-payoff.ts";

test("projects payoff for a single amortizing debt", () => {
  const result = projectDebtPayoff({ balance: 10000, annualInterestRate: 12, minimumPayment: 300 });
  assert.equal(result.payoffPossible, true);
  assert.ok(result.months !== null && result.months > 35 && result.months < 45);
  assert.ok(result.totalInterest !== null && result.totalInterest > 2000);
});

test("extra payments reduce time and interest", () => {
  const result = compareDebtExtraPayment({ balance: 10000, annualInterestRate: 12, minimumPayment: 300, extraMonthlyPayment: 200 });
  assert.ok(result.monthsSaved !== null && result.monthsSaved > 10);
  assert.ok(result.interestSaved !== null && result.interestSaved > 700);
});

test("reports non-amortizing debt as impossible", () => {
  const result = projectDebtPayoff({ balance: 10000, annualInterestRate: 24, minimumPayment: 100 });
  assert.equal(result.payoffPossible, false);
  assert.equal(result.months, null);
});

test("avalanche targets highest rate first", () => {
  const debts = [
    { id: "a", name: "Card A", balance: 5000, annualInterestRate: 24, minimumPayment: 150 },
    { id: "b", name: "Loan B", balance: 2000, annualInterestRate: 8, minimumPayment: 100 },
  ];
  const result = projectDebtStrategy(debts, 300, "avalanche");
  assert.equal(result.payoffPossible, true);
  assert.equal(result.payoffOrder[0], "Card A");
});

test("snowball targets smallest balance first", () => {
  const debts = [
    { id: "a", name: "Card A", balance: 5000, annualInterestRate: 24, minimumPayment: 150 },
    { id: "b", name: "Loan B", balance: 2000, annualInterestRate: 8, minimumPayment: 100 },
  ];
  const result = projectDebtStrategy(debts, 300, "snowball");
  assert.equal(result.payoffPossible, true);
  assert.equal(result.payoffOrder[0], "Loan B");
});

test("avalanche is not more expensive than snowball for the same debts", () => {
  const debts = [
    { id: "a", name: "Card A", balance: 6000, annualInterestRate: 22, minimumPayment: 180 },
    { id: "b", name: "Loan B", balance: 2500, annualInterestRate: 7, minimumPayment: 90 },
    { id: "c", name: "Card C", balance: 3500, annualInterestRate: 16, minimumPayment: 120 },
  ];
  const avalanche = projectDebtStrategy(debts, 400, "avalanche");
  const snowball = projectDebtStrategy(debts, 400, "snowball");
  assert.equal(avalanche.payoffPossible, true);
  assert.equal(snowball.payoffPossible, true);
  assert.ok((avalanche.totalInterest ?? Infinity) <= (snowball.totalInterest ?? Infinity));
});
