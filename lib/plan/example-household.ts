// A fixed, made-up household for the public "example household" demo. Synthetic only: it is never read from or
// written to the database, and it describes no real person.
import type { MoneyPriorityRawSnapshot } from "../calculations/money-priority-snapshot.ts";

export const EXAMPLE_HOUSEHOLD_NAME = "The Example household";

export function exampleHouseholdRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "example-household",
    people: [
      { id: "example-person-1", display_name: "Sam (example)", relationship: "self", birth_date: "1990-03-01", planned_retirement_age: 67, estimated_taxable_compensation_annual: 84000, is_active: true, is_dependent: false },
    ],
    income: [
      { id: "example-income-1", owner_person_id: "example-person-1", name: "Example paycheck", monthly_amount: 5600, monthly_gross_amount: 7000, is_variable: false, is_active: true },
    ],
    expenses: [
      { id: "example-expense-1", name: "Rent", category: "housing", monthly_amount: 1900, is_essential: true },
      { id: "example-expense-2", name: "Groceries", category: "groceries", monthly_amount: 650, is_essential: true },
      { id: "example-expense-3", name: "Utilities and phone", category: "utilities", monthly_amount: 280, is_essential: true },
      { id: "example-expense-4", name: "Car insurance and gas", category: "transportation", monthly_amount: 320, is_essential: true },
      { id: "example-expense-5", name: "Eating out and fun", category: "personal", monthly_amount: 450, is_essential: false },
    ],
    accounts: [
      { id: "example-account-1", name: "Checking", account_type: "checking", balance: 2400, cash_purpose: null },
      { id: "example-account-2", name: "Savings", account_type: "savings", balance: 3500, cash_purpose: "protected_reserve" },
    ],
    debts: [
      { id: "example-debt-1", name: "Credit card", debt_type: "credit_card", current_balance: 3800, interest_rate: 23.9, minimum_payment: 110, rate_type: "fixed" },
      { id: "example-debt-2", name: "Car loan", debt_type: "auto_loan", current_balance: 11200, interest_rate: 6.4, minimum_payment: 290, rate_type: "fixed" },
    ],
    retirementAccounts: [
      { id: "example-retirement-1", owner_person_id: "example-person-1", name: "Work 401(k)", account_type: "401k", balance: 9500, monthly_employee_contribution: 280, monthly_employer_contribution: 140, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    goals: [
      { id: "example-goal-1", name: "Vacation fund", target_amount: 3000, current_amount: 600, target_date: "2027-08-01", priority: 3, goal_class: "lifestyle_optional", necessity: "optional", planned_monthly_contribution: 150 },
    ],
  };
}
