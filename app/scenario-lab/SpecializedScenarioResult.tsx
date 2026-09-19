"use client";

import type { SpecializedScenarioRunDTO } from "@/lib/scenarios/scenario-app-contract";

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default function SpecializedScenarioResult({ result }: { result: SpecializedScenarioRunDTO }) {
  return (
    <div className="scenario-specialized-result">
      {result.genericSummary ? (
        <div>
          <p><strong>Generic scenario feasibility:</strong> {result.genericSummary.feasibility.status}</p>
          <p><strong>Generic monthly plan capacity:</strong> {money(result.genericSummary.feasibility.monthlyPlanCapacity)}</p>
        </div>
      ) : null}

      {result.specialized?.type === "home" ? (
        <div>
          <h4>Home result</h4>
          <p><strong>Overall affordability:</strong> {result.specialized.result.overallAffordability.replaceAll("_", " ")}</p>
          <p><strong>Purchase readiness:</strong> {result.specialized.result.purchaseReadiness.replaceAll("_", " ")}</p>
          <p><strong>Ongoing affordability:</strong> {result.specialized.result.ongoingAffordability.replaceAll("_", " ")}</p>
          <p><strong>Financing quality:</strong> {result.specialized.result.financing.quality.replaceAll("_", " ")}</p>
          <p><strong>Cash still required at closing:</strong> {money(result.specialized.result.cashToClose.cashStillRequiredAtClosing)}</p>
          <p><strong>Legitimate cash available:</strong> {money(result.specialized.result.cashToClose.legitimateCashAvailable)}</p>
          <p><strong>Protected cash required:</strong> {money(result.specialized.result.cashToClose.protectedCashRequired)}</p>
          <p><strong>All-in housing cost:</strong> {money(result.specialized.result.monthly.allInHousingCost)} USD/month</p>
          {result.specialized.comparison ? <p><strong>Post-home Recommendation Refresh:</strong> {result.specialized.comparison.state.replaceAll("_", " ")}</p> : null}
          {result.specialized.result.reasons.map((item) => <p className="muted" key={item}>{item}</p>)}
          {result.specialized.result.risks.length ? <p><strong>Risks:</strong> {result.specialized.result.risks.join("; ")}</p> : null}
          {result.specialized.result.warnings.length ? <p><strong>Warnings:</strong> {result.specialized.result.warnings.join("; ")}</p> : null}
          {result.specialized.result.missingData.length ? <p><strong>Missing information:</strong> {result.specialized.result.missingData.join("; ")}</p> : null}
        </div>
      ) : null}

      {result.specialized?.type === "vehicle" ? (
        <div>
          <h4>Vehicle result</h4>
          <p><strong>Affordability:</strong> {result.specialized.result.affordability.replaceAll("_", " ")}</p>
          <p><strong>Financing quality:</strong> {result.specialized.result.financing.quality.replaceAll("_", " ")}</p>
          <p><strong>Amount financed:</strong> {money(result.specialized.result.acquisition.amountFinanced)}</p>
          <p><strong>Vehicle loan payment:</strong> {money(result.specialized.result.acquisition.monthlyPayment)} USD/month</p>
          <p><strong>Cash required:</strong> {money(result.specialized.result.cash.cashRequired)}</p>
          <p><strong>Available vehicle cash:</strong> {money(result.specialized.result.cash.availableVehicleCash)}</p>
          <p><strong>Protected cash required:</strong> {money(result.specialized.result.cash.protectedCashRequired)}</p>
          <p><strong>All-in monthly impact:</strong> {money(result.specialized.result.monthlyImpact.allInMonthlyImpact)} USD/month</p>
          {result.specialized.comparison ? <p><strong>Post-vehicle Recommendation Refresh:</strong> {result.specialized.comparison.state.replaceAll("_", " ")}</p> : null}
          {result.specialized.result.reasons.map((item) => <p className="muted" key={item}>{item}</p>)}
          {result.specialized.result.risks.length ? <p><strong>Risks:</strong> {result.specialized.result.risks.join("; ")}</p> : null}
          {result.specialized.result.missingData.length ? <p><strong>Missing information:</strong> {result.specialized.result.missingData.join("; ")}</p> : null}
        </div>
      ) : null}

      {result.specialized?.type === "windfall" ? (
        <div>
          <h4>Windfall result</h4>
          <p><strong>State:</strong> {result.specialized.result.state.replaceAll("_", " ")}</p>
          <p><strong>Gross amount:</strong> {money(result.specialized.result.grossAmount)}</p>
          <p><strong>Reserved tax:</strong> {money(result.specialized.result.reservedTaxAmount)}</p>
          <p><strong>Reserved other liability:</strong> {money(result.specialized.result.reservedOtherLiabilityAmount)}</p>
          <p><strong>Restricted:</strong> {money(result.specialized.result.restrictedAmount)}</p>
          <p><strong>Earmarked:</strong> {money(result.specialized.result.earmarkedAmount)}</p>
          <p><strong>Held for tax review:</strong> {money(result.specialized.result.heldForTaxReviewAmount)}</p>
          <p><strong>Total allocated:</strong> {money(result.specialized.result.totalAllocated)}</p>
          <p><strong>Remaining unallocated:</strong> {money(result.specialized.result.remainingUnallocated)}</p>
          {result.specialized.result.allocations.map((allocation) => (
            <p key={allocation.id}>{allocation.title}: {money(allocation.allocatedAmount)} · {allocation.category}</p>
          ))}
          {result.specialized.result.warnings.length ? <p><strong>Warnings:</strong> {result.specialized.result.warnings.join("; ")}</p> : null}
          {result.specialized.result.missingData.length ? <p><strong>Missing information:</strong> {result.specialized.result.missingData.join("; ")}</p> : null}
        </div>
      ) : null}

      {result.yourPlan ? (
        <div>
          <h4>Your Plan</h4>
          <p><strong>Engine basis:</strong> {result.yourPlan.engineBasis}</p>
          <p><strong>Funding status:</strong> {result.yourPlan.result.yourPlan.fundingStatus.replaceAll("_", " ")}</p>
          <p><strong>Funding gap:</strong> {money(result.yourPlan.result.yourPlan.fundingGap)} USD/month</p>
          <p><strong>Remaining capacity:</strong> {money(result.yourPlan.result.yourPlan.remainingCapacity)} USD/month</p>
          {result.yourPlan.result.overrides.active.map((override) => <p key={"active-" + override.allocationId}><strong>Active:</strong> {override.allocationId} · {override.reason}</p>)}
          {result.yourPlan.result.overrides.superseded.map((override) => <p key={"superseded-" + override.allocationId}><strong>Superseded:</strong> {override.allocationId} · {override.reason}</p>)}
          {result.yourPlan.result.overrides.invalid.map((override) => <p key={"invalid-" + override.allocationId}><strong>Invalid:</strong> {override.allocationId} · {override.reason}</p>)}
          {result.yourPlan.result.warnings.length ? <p><strong>Warnings:</strong> {result.yourPlan.result.warnings.join("; ")}</p> : null}
        </div>
      ) : null}

      {result.conflicts && !result.conflicts.valid ? (
        <div role="alert">
          <h4>Scenario composition conflicts</h4>
          <ul>{result.conflicts.issues.map((item) => <li key={item.path + item.code}>{item.message}</li>)}</ul>
        </div>
      ) : null}

      {result.issues.length ? (
        <div role="alert">
          <h4>Scenario validation</h4>
          <ul>{result.issues.map((item) => <li key={item.path + item.code + item.message}>{item.message}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
