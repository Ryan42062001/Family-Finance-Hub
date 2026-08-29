import assert from "node:assert/strict";
import test from "node:test";
import { compareMortgageExtraPayment, projectMortgagePayoff } from "./mortgage-extra-payment.ts";

test("projects a standard fixed-rate mortgage payoff", () => {
  const result = projectMortgagePayoff({ principal: 130000, annualInterestRate: 5, monthlyPayment: 1028 });
  assert.equal(result.payoffPossible, true);
  assert.ok(result.months !== null && result.months >= 180 && result.months <= 183);
  assert.ok(result.totalInterest !== null && result.totalInterest > 54000 && result.totalInterest < 57000);
});

test("extra payments reduce payoff time and interest", () => {
  const result = compareMortgageExtraPayment({ principal: 130000, annualInterestRate: 5, monthlyPayment: 1028, extraMonthlyPayment: 300 });
  assert.ok(result.monthsSaved !== null && result.monthsSaved > 40);
  assert.ok(result.interestSaved !== null && result.interestSaved > 15000);
  assert.ok((result.accelerated.months ?? Infinity) < (result.baseline.months ?? 0));
});

test("handles a paid-off mortgage", () => {
  assert.deepEqual(projectMortgagePayoff({ principal: 0, annualInterestRate: 5, monthlyPayment: 1000 }), {
    months: 0,
    totalInterest: 0,
    totalPaid: 0,
    payoffPossible: true,
  });
});

test("reports when payment cannot amortize the balance", () => {
  const result = projectMortgagePayoff({ principal: 100000, annualInterestRate: 12, monthlyPayment: 500 });
  assert.equal(result.payoffPossible, false);
  assert.equal(result.months, null);
  assert.equal(result.totalInterest, null);
});

test("supports zero-interest loans", () => {
  const result = projectMortgagePayoff({ principal: 12000, annualInterestRate: 0, monthlyPayment: 1000 });
  assert.equal(result.months, 12);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalPaid, 12000);
});
