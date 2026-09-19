"use client";

import { useMemo, useState } from "react";

import type { HomePurchaseScenario } from "@/lib/calculations/home-affordability";
import type { VehiclePurchaseScenario } from "@/lib/calculations/vehicle-affordability";
import type { WindfallInput, WindfallSource, WindfallTaxTreatment } from "@/lib/calculations/money-priority-windfall";
import type { ScenarioLabBootstrap } from "@/lib/scenarios/scenario-app-contract";
import {
  removeScenarioPlanOverride,
  setScenarioOperationEventLink,
  setScenarioSpecializedIntent,
  upsertScenarioPlanOverride,
  type ScenarioDraft,
} from "@/lib/scenarios/scenario-drafts";
import type { ScenarioSpecializedIntent } from "@/lib/scenarios/scenario-specialized-contract";

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultHomeScenario(): HomePurchaseScenario {
  return {
    purchasePrice: 0,
    downPayment: 0,
    mortgage: {
      rateType: "fixed",
      interestRate: 0,
      termYears: 30,
      arm: null,
      hasBalloonPayment: false,
      allowsNegativeAmortization: false,
    },
    closing: {
      closingCosts: null,
      prepaidCosts: null,
      initialEscrowDeposit: null,
      earnestMoneyAlreadyPaid: 0,
      sellerCredits: 0,
      lenderCredits: 0,
      otherCredits: 0,
    },
    propertyTaxesAnnual: null,
    insurance: { homeownersAnnual: null, floodAnnual: null, otherRequiredAnnual: null },
    hoaMonthly: null,
    mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: null,
    monthlyUtilityChange: null,
    otherMonthlyPropertyCosts: null,
    immediateRequiredRepairs: 0,
    plannedNearTermRepairs: 0,
    currentHousingMonthlyCost: null,
    currentHousingCostDisappears: true,
    relatedGoalId: null,
    homeSale: null,
  };
}

function defaultVehicleScenario(): VehiclePurchaseScenario {
  return {
    needType: "planned_replacement",
    purchasePrice: 0,
    tradeInValue: 0,
    tradeInLoanPayoff: 0,
    cashDownPayment: 0,
    salesTax: null,
    titleRegistrationFees: null,
    otherPurchaseFees: null,
    loanApr: null,
    loanTermMonths: null,
    monthlyInsuranceChange: null,
    monthlyFuelChange: null,
    monthlyMaintenanceChange: null,
    monthlyRegistrationTaxChange: null,
    monthlyParkingTollsChange: null,
    relatedGoalId: null,
    coreNeedAmount: null,
  };
}

function defaultWindfallInput(): WindfallInput {
  return {
    amount: 0,
    source: "other",
    knownTaxLiability: null,
    knownOtherLiability: null,
    restrictedAmount: null,
    earmarkedAmount: null,
    taxTreatment: "uncertain",
    note: null,
  };
}

function eventId(prefix: string, draft: ScenarioDraft): string {
  return `${prefix}-${draft.localId}`;
}

function ambiguousOperation(type: string): boolean {
  return type === "cash_inflow" || type === "cash_use" || type === "synthetic_expense";
}

export default function SpecializedScenarioControls({
  draft,
  bootstrap,
  onChange,
}: {
  draft: ScenarioDraft;
  bootstrap: ScenarioLabBootstrap;
  onChange: (next: ScenarioDraft) => void;
}) {
  const [planAllocationId, setPlanAllocationId] = useState("");
  const [planAmount, setPlanAmount] = useState("");

  const specializedType = draft.specialized?.type ?? "none";

  const planOptions = useMemo(() => {
    if (draft.specializedResult) return draft.specializedResult.planAllocations;
    return (draft.result?.scenarioSummary?.recommendations ?? []).flatMap((recommendation) =>
      recommendation.allocations.map((allocation) => ({
        allocationId: allocation.allocationId,
        recommendationId: recommendation.id,
        stage: recommendation.stage,
        category: allocation.category,
        relatedEntityId: allocation.relatedEntityId,
        title: recommendation.title,
        recommendationState: recommendation.state,
        urgency: recommendation.urgency,
        recommendedMonthlyAmount: allocation.monthlyAmount,
      })));
  }, [draft.result, draft.specializedResult]);

  function chooseSpecialized(value: string) {
    let next: ScenarioSpecializedIntent | null = null;
    if (value === "home") {
      next = { type: "home", eventId: eventId("home", draft), scenario: defaultHomeScenario() };
    } else if (value === "vehicle") {
      next = { type: "vehicle", eventId: eventId("vehicle", draft), scenario: defaultVehicleScenario() };
    } else if (value === "windfall") {
      next = { type: "windfall", eventId: eventId("windfall", draft), input: defaultWindfallInput() };
    }
    onChange(setScenarioSpecializedIntent(draft, next));
  }

  function updateHome(scenario: HomePurchaseScenario) {
    if (draft.specialized?.type !== "home") return;
    onChange(setScenarioSpecializedIntent(draft, { ...draft.specialized, scenario }));
  }

  function updateVehicle(scenario: VehiclePurchaseScenario) {
    if (draft.specialized?.type !== "vehicle") return;
    onChange(setScenarioSpecializedIntent(draft, { ...draft.specialized, scenario }));
  }

  function updateWindfall(input: WindfallInput) {
    if (draft.specialized?.type !== "windfall") return;
    onChange(setScenarioSpecializedIntent(draft, { ...draft.specialized, input }));
  }

  function addPlanOverride() {
    if (!planAllocationId) return;
    const amount = Number(planAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    onChange(upsertScenarioPlanOverride(draft, planAllocationId, amount));
    setPlanAllocationId("");
    setPlanAmount("");
  }

  return (
    <section className="scenario-specialized-controls" aria-label="Specialized Scenario Lab controls">
      <fieldset className="scenario-composer">
        <legend>Specialized scenario module</legend>
        <label>
          Specialized event
          <select value={specializedType} onChange={(event) => chooseSpecialized(event.target.value)}>
            <option value="none">None</option>
            <option value="home">Home purchase</option>
            <option value="vehicle">Vehicle purchase</option>
            <option value="windfall">Windfall</option>
          </select>
        </label>
        <p className="muted">At most one specialized event can be active. Generic assumptions remain separate and are checked by the accepted FFH-042 conflict detector.</p>

        {draft.specialized?.type === "home" ? (
          <HomeFields scenario={draft.specialized.scenario} goals={bootstrap.entities.goals} onChange={updateHome} />
        ) : null}
        {draft.specialized?.type === "vehicle" ? (
          <VehicleFields scenario={draft.specialized.scenario} goals={bootstrap.entities.goals} onChange={updateVehicle} />
        ) : null}
        {draft.specialized?.type === "windfall" ? (
          <WindfallFields input={draft.specialized.input} onChange={updateWindfall} />
        ) : null}
      </fieldset>

      {draft.specialized ? (
        <fieldset className="scenario-composer">
          <legend>Generic-event ownership while specialized mode is active</legend>
          <p className="muted">Cash inflows, cash uses, and synthetic expenses need an explicit independent event ID when they are not part of the specialized event. The server still makes the final conflict decision.</p>
          {[...draft.definition.recurringOverrides, ...draft.definition.oneTimeEvents]
            .filter((operation) => ambiguousOperation(operation.type))
            .map((operation) => {
              const link = draft.operationEventLinks.find((item) => item.operationId === operation.id);
              return (
                <label key={operation.id}>
                  Independent event ID for {operation.id}
                  <input
                    value={link?.eventId ?? ""}
                    onChange={(event) => onChange(setScenarioOperationEventLink(draft, operation.id, event.target.value))}
                    placeholder="Example: independent-event-1"
                  />
                </label>
              );
            })}
          {![...draft.definition.recurringOverrides, ...draft.definition.oneTimeEvents].some((operation) => ambiguousOperation(operation.type))
            ? <p className="muted">No ambiguous generic cash/expense operations are present.</p>
            : null}
        </fieldset>
      ) : null}

      <fieldset className="scenario-composer">
        <legend>Your Plan allocation overrides</legend>
        <p className="muted">Run the scenario first to load exact stable allocation IDs for the current scenario result. Overrides change allocation choices only; they never change household facts.</p>
        {planOptions.length ? (
          <>
            <label>
              Allocation
              <select value={planAllocationId} onChange={(event) => setPlanAllocationId(event.target.value)}>
                <option value="">Choose allocation…</option>
                {planOptions.map((allocation) => (
                  <option key={allocation.allocationId} value={allocation.allocationId}>
                    {allocation.title} · {allocation.category} · {allocation.allocationId}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your Plan amount (USD/month)
              <input type="number" min="0" step="0.01" value={planAmount} onChange={(event) => setPlanAmount(event.target.value)} />
            </label>
            <button type="button" onClick={addPlanOverride}>Add or update Your Plan override</button>
          </>
        ) : <p className="muted">No current allocation IDs are available yet.</p>}
        {draft.yourPlanOverrides.map((override) => (
          <div className="scenario-assumption-row" key={override.allocationId}>
            <span>{override.allocationId}: {override.monthlyAmount.toFixed(2)} USD/month</span>
            <button type="button" className="secondary-button" onClick={() => onChange(removeScenarioPlanOverride(draft, override.allocationId))}>Remove override</button>
          </div>
        ))}
      </fieldset>
    </section>
  );
}

function HomeFields({
  scenario,
  goals,
  onChange,
}: {
  scenario: HomePurchaseScenario;
  goals: ScenarioLabBootstrap["entities"]["goals"];
  onChange: (scenario: HomePurchaseScenario) => void;
}) {
  const mortgage = scenario.mortgage;
  const closing = scenario.closing;
  const insurance = scenario.insurance;
  const homeSale = scenario.homeSale;

  return (
    <>
      <label>Purchase price (USD)<input type="number" min="0" step="0.01" value={scenario.purchasePrice} onChange={(e) => onChange({ ...scenario, purchasePrice: numberOr(e.target.value, 0) })} /></label>
      <label>Down payment (USD)<input type="number" min="0" step="0.01" value={scenario.downPayment} onChange={(e) => onChange({ ...scenario, downPayment: numberOr(e.target.value, 0) })} /></label>
      <label>Mortgage rate type
        <select value={mortgage.rateType} onChange={(e) => {
          const rateType = e.target.value as "fixed" | "adjustable";
          onChange({
            ...scenario,
            mortgage: {
              ...mortgage,
              rateType,
              arm: rateType === "adjustable"
                ? mortgage.arm ?? { initialFixedMonths: 60, adjustmentFrequencyMonths: 12, initialAdjustmentCap: 2, subsequentAdjustmentCap: 2, lifetimeAdjustmentCap: 5 }
                : null,
            },
          });
        }}>
          <option value="fixed">Fixed</option><option value="adjustable">Adjustable</option>
        </select>
      </label>
      <label>Mortgage interest rate (percent)<input type="number" min="0" step="0.01" value={mortgage.interestRate} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, interestRate: numberOr(e.target.value, 0) } })} /></label>
      <label>Mortgage term (years)<input type="number" min="1" step="1" value={mortgage.termYears} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, termYears: numberOr(e.target.value, 30) } })} /></label>
      {mortgage.rateType === "adjustable" && mortgage.arm ? (
        <>
          <label>ARM initial fixed period (months)<input type="number" min="1" step="1" value={mortgage.arm.initialFixedMonths} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, arm: { ...mortgage.arm!, initialFixedMonths: numberOr(e.target.value, 60) } } })} /></label>
          <label>ARM adjustment frequency (months)<input type="number" min="1" step="1" value={mortgage.arm.adjustmentFrequencyMonths} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, arm: { ...mortgage.arm!, adjustmentFrequencyMonths: numberOr(e.target.value, 12) } } })} /></label>
          <label>ARM initial adjustment cap (points)<input type="number" min="0" step="0.01" value={mortgage.arm.initialAdjustmentCap} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, arm: { ...mortgage.arm!, initialAdjustmentCap: numberOr(e.target.value, 0) } } })} /></label>
          <label>ARM subsequent adjustment cap (points)<input type="number" min="0" step="0.01" value={mortgage.arm.subsequentAdjustmentCap} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, arm: { ...mortgage.arm!, subsequentAdjustmentCap: numberOr(e.target.value, 0) } } })} /></label>
          <label>ARM lifetime adjustment cap (points)<input type="number" min="0" step="0.01" value={mortgage.arm.lifetimeAdjustmentCap} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, arm: { ...mortgage.arm!, lifetimeAdjustmentCap: numberOr(e.target.value, 0) } } })} /></label>
        </>
      ) : null}
      <label><input type="checkbox" checked={mortgage.hasBalloonPayment} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, hasBalloonPayment: e.target.checked } })} /> Mortgage has balloon payment</label>
      <label><input type="checkbox" checked={mortgage.allowsNegativeAmortization} onChange={(e) => onChange({ ...scenario, mortgage: { ...mortgage, allowsNegativeAmortization: e.target.checked } })} /> Mortgage allows negative amortization</label>

      <label>Closing costs (USD, optional)<input type="number" min="0" step="0.01" value={closing.closingCosts ?? ""} onChange={(e) => onChange({ ...scenario, closing: { ...closing, closingCosts: nullableNumber(e.target.value) } })} /></label>
      <label>Prepaid costs (USD, optional)<input type="number" min="0" step="0.01" value={closing.prepaidCosts ?? ""} onChange={(e) => onChange({ ...scenario, closing: { ...closing, prepaidCosts: nullableNumber(e.target.value) } })} /></label>
      <label>Initial escrow deposit (USD, optional)<input type="number" min="0" step="0.01" value={closing.initialEscrowDeposit ?? ""} onChange={(e) => onChange({ ...scenario, closing: { ...closing, initialEscrowDeposit: nullableNumber(e.target.value) } })} /></label>
      <label>Earnest money already paid (USD)<input type="number" min="0" step="0.01" value={closing.earnestMoneyAlreadyPaid} onChange={(e) => onChange({ ...scenario, closing: { ...closing, earnestMoneyAlreadyPaid: numberOr(e.target.value, 0) } })} /></label>
      <label>Seller credits (USD)<input type="number" min="0" step="0.01" value={closing.sellerCredits} onChange={(e) => onChange({ ...scenario, closing: { ...closing, sellerCredits: numberOr(e.target.value, 0) } })} /></label>
      <label>Lender credits (USD)<input type="number" min="0" step="0.01" value={closing.lenderCredits} onChange={(e) => onChange({ ...scenario, closing: { ...closing, lenderCredits: numberOr(e.target.value, 0) } })} /></label>
      <label>Other credits (USD)<input type="number" min="0" step="0.01" value={closing.otherCredits} onChange={(e) => onChange({ ...scenario, closing: { ...closing, otherCredits: numberOr(e.target.value, 0) } })} /></label>

      <label>Property taxes (USD/year, optional)<input type="number" min="0" step="0.01" value={scenario.propertyTaxesAnnual ?? ""} onChange={(e) => onChange({ ...scenario, propertyTaxesAnnual: nullableNumber(e.target.value) })} /></label>
      <label>Homeowners insurance (USD/year, optional)<input type="number" min="0" step="0.01" value={insurance.homeownersAnnual ?? ""} onChange={(e) => onChange({ ...scenario, insurance: { ...insurance, homeownersAnnual: nullableNumber(e.target.value) } })} /></label>
      <label>Flood insurance (USD/year, optional)<input type="number" min="0" step="0.01" value={insurance.floodAnnual ?? ""} onChange={(e) => onChange({ ...scenario, insurance: { ...insurance, floodAnnual: nullableNumber(e.target.value) } })} /></label>
      <label>Other required insurance (USD/year, optional)<input type="number" min="0" step="0.01" value={insurance.otherRequiredAnnual ?? ""} onChange={(e) => onChange({ ...scenario, insurance: { ...insurance, otherRequiredAnnual: nullableNumber(e.target.value) } })} /></label>
      <label>HOA (USD/month, optional)<input type="number" min="0" step="0.01" value={scenario.hoaMonthly ?? ""} onChange={(e) => onChange({ ...scenario, hoaMonthly: nullableNumber(e.target.value) })} /></label>

      <label>Mortgage insurance type
        <select value={scenario.mortgageInsurance.type} onChange={(e) => onChange({ ...scenario, mortgageInsurance: { ...scenario.mortgageInsurance, type: e.target.value as HomePurchaseScenario["mortgageInsurance"]["type"] } })}>
          <option value="none">None</option><option value="conventional_pmi">Conventional PMI</option><option value="fha_mip">FHA MIP</option><option value="other">Other</option>
        </select>
      </label>
      <label>Mortgage insurance (USD/month, optional)<input type="number" min="0" step="0.01" value={scenario.mortgageInsurance.monthlyAmount ?? ""} onChange={(e) => onChange({ ...scenario, mortgageInsurance: { ...scenario.mortgageInsurance, monthlyAmount: nullableNumber(e.target.value) } })} /></label>
      <label>Maintenance planning (USD/month, optional)<input type="number" min="0" step="0.01" value={scenario.monthlyMaintenancePlanningAmount ?? ""} onChange={(e) => onChange({ ...scenario, monthlyMaintenancePlanningAmount: nullableNumber(e.target.value) })} /></label>
      <label>Utility change (USD/month, optional)<input type="number" step="0.01" value={scenario.monthlyUtilityChange ?? ""} onChange={(e) => onChange({ ...scenario, monthlyUtilityChange: nullableNumber(e.target.value) })} /></label>
      <label>Other property costs (USD/month, optional)<input type="number" min="0" step="0.01" value={scenario.otherMonthlyPropertyCosts ?? ""} onChange={(e) => onChange({ ...scenario, otherMonthlyPropertyCosts: nullableNumber(e.target.value) })} /></label>
      <label>Immediate required repairs (USD)<input type="number" min="0" step="0.01" value={scenario.immediateRequiredRepairs} onChange={(e) => onChange({ ...scenario, immediateRequiredRepairs: numberOr(e.target.value, 0) })} /></label>
      <label>Planned near-term repairs (USD)<input type="number" min="0" step="0.01" value={scenario.plannedNearTermRepairs} onChange={(e) => onChange({ ...scenario, plannedNearTermRepairs: numberOr(e.target.value, 0) })} /></label>
      <label>Current housing cost (USD/month, optional)<input type="number" min="0" step="0.01" value={scenario.currentHousingMonthlyCost ?? ""} onChange={(e) => onChange({ ...scenario, currentHousingMonthlyCost: nullableNumber(e.target.value) })} /></label>
      <label><input type="checkbox" checked={scenario.currentHousingCostDisappears} onChange={(e) => onChange({ ...scenario, currentHousingCostDisappears: e.target.checked })} /> Current housing cost disappears after purchase</label>
      <label>Related goal stable ID
        <select value={scenario.relatedGoalId ?? ""} onChange={(e) => onChange({ ...scenario, relatedGoalId: e.target.value || null })}>
          <option value="">None</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.label} · {goal.id}</option>)}
        </select>
      </label>

      <label><input type="checkbox" checked={Boolean(homeSale)} onChange={(e) => onChange({
        ...scenario,
        homeSale: e.target.checked ? {
          proceedsState: "uncertain",
          expectedNetSaleProceeds: 0,
          proceedsAlreadyIncludedInSnapshotCash: false,
          currentHomeMonthlyCarryingCost: 0,
          expectedHousingOverlapMonths: 0,
        } : null,
      })} /> Include current-home sale proceeds/timing</label>
      {homeSale ? (
        <>
          <label>Sale proceeds timing
            <select value={homeSale.proceedsState} onChange={(e) => onChange({ ...scenario, homeSale: { ...homeSale, proceedsState: e.target.value as NonNullable<HomePurchaseScenario["homeSale"]>["proceedsState"] } })}>
              <option value="already_received">Already received</option><option value="closing_before_purchase">Closing before purchase</option><option value="simultaneous_closing">Simultaneous closing</option><option value="expected_after_purchase">Expected after purchase</option><option value="uncertain">Uncertain</option>
            </select>
          </label>
          <label>Expected net sale proceeds (USD)<input type="number" min="0" step="0.01" value={homeSale.expectedNetSaleProceeds} onChange={(e) => onChange({ ...scenario, homeSale: { ...homeSale, expectedNetSaleProceeds: numberOr(e.target.value, 0) } })} /></label>
          <label><input type="checkbox" checked={homeSale.proceedsAlreadyIncludedInSnapshotCash} onChange={(e) => onChange({ ...scenario, homeSale: { ...homeSale, proceedsAlreadyIncludedInSnapshotCash: e.target.checked } })} /> Sale proceeds are already included in current snapshot cash</label>
          <label>Current-home carrying cost (USD/month)<input type="number" min="0" step="0.01" value={homeSale.currentHomeMonthlyCarryingCost} onChange={(e) => onChange({ ...scenario, homeSale: { ...homeSale, currentHomeMonthlyCarryingCost: numberOr(e.target.value, 0) } })} /></label>
          <label>Expected housing overlap (months)<input type="number" min="0" step="1" value={homeSale.expectedHousingOverlapMonths} onChange={(e) => onChange({ ...scenario, homeSale: { ...homeSale, expectedHousingOverlapMonths: numberOr(e.target.value, 0) } })} /></label>
        </>
      ) : null}
    </>
  );
}

function VehicleFields({
  scenario,
  goals,
  onChange,
}: {
  scenario: VehiclePurchaseScenario;
  goals: ScenarioLabBootstrap["entities"]["goals"];
  onChange: (scenario: VehiclePurchaseScenario) => void;
}) {
  return (
    <>
      <label>Vehicle need
        <select value={scenario.needType} onChange={(e) => onChange({ ...scenario, needType: e.target.value as VehiclePurchaseScenario["needType"] })}>
          <option value="necessary">Necessary</option><option value="planned_replacement">Planned replacement</option><option value="optional_upgrade">Optional upgrade</option>
        </select>
      </label>
      <label>Purchase price (USD)<input type="number" min="0" step="0.01" value={scenario.purchasePrice} onChange={(e) => onChange({ ...scenario, purchasePrice: numberOr(e.target.value, 0) })} /></label>
      <label>Trade-in value (USD)<input type="number" min="0" step="0.01" value={scenario.tradeInValue} onChange={(e) => onChange({ ...scenario, tradeInValue: numberOr(e.target.value, 0) })} /></label>
      <label>Trade-in loan payoff (USD)<input type="number" min="0" step="0.01" value={scenario.tradeInLoanPayoff} onChange={(e) => onChange({ ...scenario, tradeInLoanPayoff: numberOr(e.target.value, 0) })} /></label>
      <label>Cash down payment (USD)<input type="number" min="0" step="0.01" value={scenario.cashDownPayment} onChange={(e) => onChange({ ...scenario, cashDownPayment: numberOr(e.target.value, 0) })} /></label>
      <label>Sales tax (USD, optional)<input type="number" min="0" step="0.01" value={scenario.salesTax ?? ""} onChange={(e) => onChange({ ...scenario, salesTax: nullableNumber(e.target.value) })} /></label>
      <label>Title/registration fees (USD, optional)<input type="number" min="0" step="0.01" value={scenario.titleRegistrationFees ?? ""} onChange={(e) => onChange({ ...scenario, titleRegistrationFees: nullableNumber(e.target.value) })} /></label>
      <label>Other purchase fees (USD, optional)<input type="number" min="0" step="0.01" value={scenario.otherPurchaseFees ?? ""} onChange={(e) => onChange({ ...scenario, otherPurchaseFees: nullableNumber(e.target.value) })} /></label>
      <label>Loan APR (percent, optional)<input type="number" min="0" step="0.01" value={scenario.loanApr ?? ""} onChange={(e) => onChange({ ...scenario, loanApr: nullableNumber(e.target.value) })} /></label>
      <label>Loan term (months, optional)<input type="number" min="1" step="1" value={scenario.loanTermMonths ?? ""} onChange={(e) => onChange({ ...scenario, loanTermMonths: nullableNumber(e.target.value) })} /></label>
      <label>Insurance change (USD/month, optional)<input type="number" step="0.01" value={scenario.monthlyInsuranceChange ?? ""} onChange={(e) => onChange({ ...scenario, monthlyInsuranceChange: nullableNumber(e.target.value) })} /></label>
      <label>Fuel change (USD/month, optional)<input type="number" step="0.01" value={scenario.monthlyFuelChange ?? ""} onChange={(e) => onChange({ ...scenario, monthlyFuelChange: nullableNumber(e.target.value) })} /></label>
      <label>Maintenance change (USD/month, optional)<input type="number" step="0.01" value={scenario.monthlyMaintenanceChange ?? ""} onChange={(e) => onChange({ ...scenario, monthlyMaintenanceChange: nullableNumber(e.target.value) })} /></label>
      <label>Registration/tax change (USD/month, optional)<input type="number" step="0.01" value={scenario.monthlyRegistrationTaxChange ?? ""} onChange={(e) => onChange({ ...scenario, monthlyRegistrationTaxChange: nullableNumber(e.target.value) })} /></label>
      <label>Parking/tolls change (USD/month, optional)<input type="number" step="0.01" value={scenario.monthlyParkingTollsChange ?? ""} onChange={(e) => onChange({ ...scenario, monthlyParkingTollsChange: nullableNumber(e.target.value) })} /></label>
      <label>Core need amount (USD, optional)<input type="number" min="0" step="0.01" value={scenario.coreNeedAmount ?? ""} onChange={(e) => onChange({ ...scenario, coreNeedAmount: nullableNumber(e.target.value) })} /></label>
      <label>Related goal stable ID
        <select value={scenario.relatedGoalId ?? ""} onChange={(e) => onChange({ ...scenario, relatedGoalId: e.target.value || null })}>
          <option value="">None</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.label} · {goal.id}</option>)}
        </select>
      </label>
    </>
  );
}

function WindfallFields({ input, onChange }: { input: WindfallInput; onChange: (input: WindfallInput) => void }) {
  const sources: WindfallSource[] = ["bonus", "inheritance", "tax_refund", "gift", "asset_sale", "insurance_proceeds", "legal_settlement", "business_distribution", "other"];
  const treatments: WindfallTaxTreatment[] = ["known_non_taxable", "known_taxable_liability_provided", "uncertain", "not_applicable"];
  return (
    <>
      <label>Gross windfall amount (USD)<input type="number" min="0" step="0.01" value={input.amount} onChange={(e) => onChange({ ...input, amount: numberOr(e.target.value, 0) })} /></label>
      <label>Windfall source<select value={input.source} onChange={(e) => onChange({ ...input, source: e.target.value as WindfallSource })}>{sources.map((source) => <option key={source} value={source}>{source.replaceAll("_", " ")}</option>)}</select></label>
      <label>Tax treatment<select value={input.taxTreatment ?? "uncertain"} onChange={(e) => onChange({ ...input, taxTreatment: e.target.value as WindfallTaxTreatment })}>{treatments.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label>Known tax liability (USD, optional)<input type="number" min="0" step="0.01" value={input.knownTaxLiability ?? ""} onChange={(e) => onChange({ ...input, knownTaxLiability: nullableNumber(e.target.value) })} /></label>
      <label>Known other liability (USD, optional)<input type="number" min="0" step="0.01" value={input.knownOtherLiability ?? ""} onChange={(e) => onChange({ ...input, knownOtherLiability: nullableNumber(e.target.value) })} /></label>
      <label>Restricted amount (USD, optional)<input type="number" min="0" step="0.01" value={input.restrictedAmount ?? ""} onChange={(e) => onChange({ ...input, restrictedAmount: nullableNumber(e.target.value) })} /></label>
      <label>Earmarked amount (USD, optional)<input type="number" min="0" step="0.01" value={input.earmarkedAmount ?? ""} onChange={(e) => onChange({ ...input, earmarkedAmount: nullableNumber(e.target.value) })} /></label>
      <label>Planning note (optional)<input value={input.note ?? ""} onChange={(e) => onChange({ ...input, note: e.target.value || null })} /></label>
    </>
  );
}
