import type { MoneyPriorityRawSnapshot, MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

export function moneyPrioritySnapshotToRaw(snapshot: MoneyPrioritySnapshot): MoneyPriorityRawSnapshot {
  return {
    householdId: snapshot.householdId,
    people: snapshot.people.map((item) => ({
      id: item.id, display_name: item.displayName, relationship: item.relationship, birth_date: item.birthDate,
      planned_retirement_age: item.plannedRetirementAge, covered_by_workplace_retirement_plan: item.coveredByWorkplaceRetirementPlan,
      estimated_taxable_compensation_annual: item.estimatedTaxableCompensationAnnual, is_dependent: item.isDependent, is_active: item.isActive,
    })),
    income: snapshot.income.map((item) => ({
      id: item.id, owner_person_id: item.ownerPersonId, name: item.name, income_type: item.type,
      monthly_amount: item.monthlyTakeHomeAmount, monthly_gross_amount: item.monthlyGrossAmount, is_variable: item.isVariable, is_active: item.isActive,
    })),
    expenses: snapshot.expenses.map((item) => ({
      id: item.id, name: item.name, category: item.category, monthly_amount: item.monthlyAmount,
      is_essential: item.isEssential, cash_flow_treatment: item.cashFlowTreatment,
    })),
    accounts: snapshot.accounts.map((item) => ({
      id: item.id, name: item.name, account_type: item.type, balance: item.balance, cash_purpose: item.cashPurpose,
      related_goal_id: item.relatedGoalId, related_debt_id: item.relatedDebtId,
    })),
    debts: snapshot.debts.map((item) => ({
      id: item.id, name: item.name, debt_type: item.type, current_balance: item.balance, interest_rate: item.annualInterestRate,
      minimum_payment: item.minimumPayment, rate_type: item.rateType, promo_rate_expires_on: item.promoRateExpiresOn,
      post_promo_interest_rate: item.postPromoInterestRate, is_past_due: item.isPastDue, is_in_collections: item.isInCollections,
      has_legal_or_tax_priority: item.hasLegalOrTaxPriority, forgiveness_or_repayment_program: item.forgivenessOrRepaymentProgram,
      scheduled_payoff_date: item.scheduledPayoffDate, student_loan_source: item.studentLoanSource,
      student_loan_repayment_plan: item.studentLoanRepaymentPlan, student_loan_forgiveness_strategy: item.studentLoanForgivenessStrategy,
      student_loan_strategy_active: item.studentLoanStrategyActive, current_required_monthly_payment: item.currentRequiredMonthlyPayment,
      qualifying_payments_made: item.qualifyingPaymentsMade, qualifying_payments_required: item.qualifyingPaymentsRequired,
      estimated_forgiveness_amount: item.estimatedForgivenessAmount, estimated_forgiveness_date: item.estimatedForgivenessDate,
      forgiveness_tax_treatment: item.forgivenessTaxTreatment, estimated_forgiveness_tax_liability: item.estimatedForgivenessTaxLiability,
      employer_direct_loan_assistance_monthly: item.employerDirectLoanAssistanceMonthly,
      employer_direct_loan_assistance_remaining: item.employerDirectLoanAssistanceRemaining,
      qualified_student_loan_payment_retirement_match_offered: item.qualifiedStudentLoanPaymentRetirementMatchOffered,
      qualified_payment_required_for_full_retirement_match: item.qualifiedPaymentRequiredForFullRetirementMatch,
      expected_student_loan_based_employer_match_monthly: item.expectedStudentLoanBasedEmployerMatchMonthly,
    })),
    retirementAccounts: snapshot.retirementAccounts.map((item) => ({
      id: item.id, owner_person_id: item.ownerPersonId, name: item.name, account_type: item.type, balance: item.balance,
      monthly_employee_contribution: item.monthlyEmployeeContribution, monthly_employer_contribution: item.monthlyEmployerContribution,
      tax_treatment: item.taxTreatment, employee_contributed_ytd: item.employeeContributedYtd, employer_contributed_ytd: item.employerContributedYtd,
      hsa_ytd_tax_year: item.hsaYtdTaxYear, annual_contribution_target: item.annualContributionTarget,
      full_match_employee_contribution_monthly: item.fullMatchEmployeeContributionMonthly, match_status: item.matchStatus,
      hsa_coverage_type: item.hsaCoverageType, hsa_eligible: item.hsaEligible, simple_higher_limit_eligible: item.simpleHigherLimitEligible,
      simple_plan_limit_category: item.simplePlanLimitCategory, simple_plan_limit_tax_year: item.simplePlanLimitTaxYear,
      employer_contribution_type: item.employerContributionType, plan_eligible_compensation_annual: item.planEligibleCompensationAnnual,
      prior_year_sponsor_wages: item.priorYearSponsorWages, roth_catch_up_supported: item.rothCatchUpSupported,
      sep_eligible_compensation_annual: item.sepEligibleCompensationAnnual, sep_compensation_calculation_supported: item.sepCompensationCalculationSupported,
    })),
    hsaTaxYearProfiles: snapshot.hsa.profiles.map((item) => ({
      id: item.id, person_id: item.personId, tax_year: item.taxYear, medicare_effective_on: item.medicareEffectiveOn,
      last_month_rule_status: item.lastMonthRuleStatus, testing_period_status: item.testingPeriodStatus,
      confirmed_at: item.confirmedAt, data_version: item.dataVersion,
    })),
    hsaMonthStatuses: snapshot.hsa.months.map((item) => ({
      id: item.id, person_id: item.personId, tax_year: item.taxYear, month: item.month,
      eligibility_status: item.eligibilityStatus, coverage_status: item.coverageStatus, evidence_status: item.evidenceStatus,
    })),
    hsaMarriedAllocations: snapshot.hsa.marriedAllocations.map((item) => ({
      id: item.id, tax_year: item.taxYear, person_one_id: item.personOneId, person_two_id: item.personTwoId,
      person_one_ordinary_amount: item.personOneOrdinaryAmount, person_two_ordinary_amount: item.personTwoOrdinaryAmount, confirmed_at: item.confirmedAt,
    })),
    hsaLegalSpouseAuthorities: snapshot.hsa.legalSpouseAuthorities.map((item) => ({
      id: item.id, tax_year: item.taxYear, person_one_id: item.personOneId, person_two_id: item.personTwoId,
      authority_status: item.status, confirmation_source: item.confirmationSource,
      confirmed_at: item.confirmedAt, data_version: item.dataVersion,
    })),
    goals: snapshot.goals.map((item) => ({
      id: item.id, name: item.name, target_amount: item.targetAmount, current_amount: item.currentAmount, target_date: item.targetDate,
      priority: item.priority, goal_class: item.goalClass, necessity: item.necessity, deadline_flexibility: item.deadlineFlexibility,
      consequence_level: item.consequenceLevel, planned_monthly_contribution: item.plannedMonthlyContribution, core_need_amount: item.coreNeedAmount,
      goal_intelligence_confirmed: item.goalIntelligenceConfirmed, underlying_need: item.underlyingNeed, desired_solution: item.desiredSolution,
      goal_nature: item.goalNature, underfunding_consequence: item.underfundingConsequence, borrowing_likelihood: item.borrowingLikelihood,
      expected_borrowing_amount: item.expectedBorrowingAmount, expected_borrowing_apr: item.expectedBorrowingApr,
    })),
    insuranceExposures: snapshot.insuranceExposures.map((item) => ({
      id: item.id, person_id: item.personId, name: item.name, insurance_type: item.type, deductible_amount: item.deductibleAmount,
      family_deductible_amount: item.familyDeductibleAmount, out_of_pocket_max: item.outOfPocketMax,
      percentage_deductible: item.percentageDeductible, insured_value: item.insuredValue, is_relevant_to_reserve: item.isRelevantToReserve,
    })),
    preferences: snapshot.preferences ? {
      emergency_fund_months_override: snapshot.preferences.emergencyFundMonthsOverride, debt_vs_investing: snapshot.preferences.debtVsInvesting,
      roth_vs_traditional: snapshot.preferences.rothVsTraditional, risk_tolerance: snapshot.preferences.riskTolerance,
      retirement_priority: snapshot.preferences.retirementPriority, job_replacement_difficulty: snapshot.preferences.jobReplacementDifficulty,
      known_income_disruption: snapshot.preferences.knownIncomeDisruption, known_income_disruption_end_date: snapshot.preferences.knownIncomeDisruptionEndDate,
      desired_retirement_monthly_spending: snapshot.preferences.desiredRetirementMonthlySpending,
      retirement_spending_basis: snapshot.preferences.retirementSpendingBasis, planning_social_security_monthly: snapshot.preferences.planningSocialSecurityMonthly,
      planning_pension_monthly: snapshot.preferences.planningPensionMonthly, expected_hsa_medical_spending_annual: snapshot.preferences.expectedHsaMedicalSpendingAnnual,
      tax_profile_year: snapshot.preferences.taxProfileYear, tax_filing_status: snapshot.preferences.taxFilingStatus,
      estimated_modified_agi: snapshot.preferences.estimatedModifiedAgi, lived_with_spouse_during_tax_year: snapshot.preferences.livedWithSpouseDuringTaxYear,
    } : null,
  };
}

