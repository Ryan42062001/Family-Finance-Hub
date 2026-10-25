"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  compareScenariosAction,
  rebaseSpecializedScenarioAction,
  runScenarioAction,
  runSpecializedScenarioAction,
} from "./actions";
import SpecializedScenarioControls from "./SpecializedScenarioControls";
import SpecializedScenarioResult from "./SpecializedScenarioResult";
import type {
  ScenarioLabBootstrap,
  ScenarioPairComparisonDTO,
} from "@/lib/scenarios/scenario-app-contract";
import {
  createScenarioDraft,
  discardScenarioDraft,
  duplicateScenarioDraft,
  editScenarioDraft,
  resetScenarioDraft,
  scenarioDraftCanCompare,
  specializedScenarioSubmission,
  type ScenarioDraft,
} from "@/lib/scenarios/scenario-drafts";
import type {
  ScenarioDefinition,
  ScenarioOneTimeEvent,
  ScenarioRecurringOverride,
} from "@/lib/scenarios/scenario-definition";
import {
  allocationDisplayName,
  capacityChange,
  refreshStateLabel,
  scenarioOperationPresentation,
  scenarioStatusLabel,
} from "@/lib/scenarios/scenario-presentation";

type EditorKind =
  | "income"
  | "additional_income"
  | "expense"
  | "childcare"
  | "debt"
  | "debt_payoff"
  | "goal"
  | "retirement"
  | "retirement_age"
  | "insurance"
  | "planning_preferences"
  | "job_loss"
  | "cash_inflow"
  | "cash_use"
  | "medical_cash_use";

const EDITOR_LABELS: Record<EditorKind, string> = {
  income: "Income / paycheck change",
  additional_income: "Additional recurring income",
  expense: "Recurring expense change",
  childcare: "Childcare recurring expense",
  debt: "Debt balance / payment / APR",
  debt_payoff: "Cash-funded debt payoff",
  goal: "Goal amount / date / priority / contribution",
  retirement: "Scheduled retirement contribution",
  retirement_age: "Planned retirement age",
  insurance: "Insurance exposure assumption",
  planning_preferences: "Planning preferences",
  job_loss: "Job loss / temporary income reduction",
  cash_inflow: "One-time cash inflow",
  cash_use: "One-time generic cash use",
  medical_cash_use: "Cash-impact-only medical expense",
};

function localId(prefix: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.trunc(performance.now())}`;
  return `${prefix}-${suffix}`;
}

function numberValue(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function submission(draft: ScenarioDraft) {
  return {
    definition: draft.definition,
    baselineFingerprint: draft.baseline.fingerprint,
    baselinePolicyBasis: draft.baseline.policyBasis,
  };
}

function replaceDraft(drafts: ScenarioDraft[], next: ScenarioDraft): ScenarioDraft[] {
  return drafts.map((draft) => draft.localId === next.localId ? next : draft);
}

function appendOperations(
  draft: ScenarioDraft,
  recurring: ScenarioRecurringOverride[] = [],
  events: ScenarioOneTimeEvent[] = [],
): ScenarioDraft {
  const definition: ScenarioDefinition = {
    ...draft.definition,
    recurringOverrides: [...draft.definition.recurringOverrides, ...recurring],
    oneTimeEvents: [...draft.definition.oneTimeEvents, ...events],
  };
  return editScenarioDraft(draft, definition);
}

function removeOperation(draft: ScenarioDraft, operationId: string): ScenarioDraft {
  const next = editScenarioDraft(draft, {
    ...draft.definition,
    recurringOverrides: draft.definition.recurringOverrides.filter((item) => item.id !== operationId),
    oneTimeEvents: draft.definition.oneTimeEvents.filter((item) => item.id !== operationId),
  });
  return {
    ...next,
    operationEventLinks: draft.operationEventLinks.filter((link) => link.operationId !== operationId),
  };
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function AssumptionComposer({
  draft,
  bootstrap,
  onChange,
}: {
  draft: ScenarioDraft;
  bootstrap: ScenarioLabBootstrap;
  onChange: (next: ScenarioDraft) => void;
}) {
  const [kind, setKind] = useState<EditorKind>("income");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [amount2, setAmount2] = useState("");
  const [amount3, setAmount3] = useState("");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState("");
  const [error, setError] = useState("");

  const options = kind === "income" || kind === "job_loss" ? bootstrap.entities.income
    : kind === "expense" ? bootstrap.entities.expenses
      : kind === "debt" || kind === "debt_payoff" ? bootstrap.entities.debts
        : kind === "goal" ? bootstrap.entities.goals
          : kind === "retirement" ? bootstrap.entities.retirementAccounts
            : kind === "retirement_age" ? bootstrap.entities.people
              : kind === "insurance" ? bootstrap.entities.insuranceExposures
                : [];

  function add() {
    const id = localId("assumption");
    const a = numberValue(amount);
    const b = numberValue(amount2);
    const c = numberValue(amount3);
    const recurring: ScenarioRecurringOverride[] = [];
    const events: ScenarioOneTimeEvent[] = [];
    setError("");

    if (kind === "income") {
      if (!target || a === undefined) return setError("Choose an income source and enter monthly take-home income.");
      recurring.push({ type: "income", id, incomeId: target, monthlyTakeHomeAmount: a });
    } else if (kind === "additional_income") {
      if (a === undefined) return setError("Enter monthly take-home income.");
      recurring.push({
        type: "synthetic_income", id, incomeId: localId("scenario-income"), name: label.trim() || "Additional income",
        incomeType: "other", ownerPersonId: null, monthlyTakeHomeAmount: a, monthlyGrossAmount: b ?? null,
        isVariable: false, isActive: true,
      });
    } else if (kind === "expense") {
      if (!target || a === undefined) return setError("Choose an expense and enter its monthly amount.");
      recurring.push({ type: "expense", id, expenseId: target, monthlyAmount: a });
    } else if (kind === "childcare") {
      if (a === undefined) return setError("Enter a monthly childcare amount.");
      recurring.push({
        type: "synthetic_expense", id, expenseId: localId("scenario-childcare"), name: label.trim() || "Childcare",
        category: "childcare", monthlyAmount: a, isEssential: true, cashFlowTreatment: "required",
      });
    } else if (kind === "debt") {
      if (!target || [a, b, c].every((value) => value === undefined)) return setError("Choose a debt and enter at least one changed value.");
      recurring.push({
        type: "debt", id, debtId: target,
        ...(a === undefined ? {} : { balance: a }),
        ...(b === undefined ? {} : { minimumPayment: b }),
        ...(c === undefined ? {} : { annualInterestRate: c }),
      });
    } else if (kind === "debt_payoff") {
      if (!target) return setError("Choose a debt to pay off.");
      events.push({ type: "cash_funded_debt_payoff", id, debtId: target });
    } else if (kind === "goal") {
      if (!target || (a === undefined && b === undefined && !date && !priority)) return setError("Choose a goal and enter at least one changed value.");
      recurring.push({
        type: "goal", id, goalId: target,
        ...(a === undefined ? {} : { targetAmount: a }),
        ...(date ? { targetDate: date } : {}),
        ...(priority ? { priority: Number(priority) } : {}),
        ...(b === undefined ? {} : { plannedMonthlyContribution: b }),
      });
    } else if (kind === "retirement") {
      if (!target || (a === undefined && b === undefined)) return setError("Choose an account and enter a monthly contribution or annual target.");
      recurring.push({
        type: "retirement_account", id, accountId: target,
        ...(a === undefined ? {} : { monthlyEmployeeContribution: a }),
        ...(b === undefined ? {} : { annualContributionTarget: b }),
      });
    } else if (kind === "retirement_age") {
      if (!target || a === undefined) return setError("Choose a person and enter a planned retirement age.");
      recurring.push({ type: "person_retirement_age", id, personId: target, plannedRetirementAge: a });
    } else if (kind === "insurance") {
      if (!target || (a === undefined && b === undefined && c === undefined)) return setError("Choose an exposure and enter at least one amount.");
      recurring.push({
        type: "insurance_exposure", id, exposureId: target,
        ...(a === undefined ? {} : { deductibleAmount: a }),
        ...(b === undefined ? {} : { familyDeductibleAmount: b }),
        ...(c === undefined ? {} : { outOfPocketMax: c }),
      });
    } else if (kind === "planning_preferences") {
      if (a === undefined && b === undefined && c === undefined) return setError("Enter at least one planning preference.");
      recurring.push({
        type: "planning_preferences", id,
        ...(a === undefined ? {} : { emergencyFundMonthsOverride: a }),
        ...(b === undefined ? {} : { desiredRetirementMonthlySpending: b }),
        ...(c === undefined ? {} : { planningSocialSecurityMonthly: c }),
      });
    } else if (kind === "job_loss") {
      if (!target || a === undefined || !date) return setError("Choose income, enter the temporary monthly take-home amount, and provide an end date.");
      recurring.push({ type: "income", id: id + "-income", incomeId: target, monthlyTakeHomeAmount: a });
      recurring.push({ type: "planning_preferences", id: id + "-disruption", knownIncomeDisruption: true, knownIncomeDisruptionEndDate: date });
    } else if (kind === "cash_inflow") {
      if (a === undefined) return setError("Enter a one-time cash inflow.");
      events.push({ type: "cash_inflow", id, amount: a, label: label.trim() || "One-time cash inflow" });
    } else if (kind === "cash_use" || kind === "medical_cash_use") {
      if (a === undefined) return setError("Enter a one-time cash amount.");
      events.push({ type: "cash_use", id, amount: a, purpose: kind === "medical_cash_use" ? "medical" : "generic" });
    }

    onChange(appendOperations(draft, recurring, events));
    setAmount(""); setAmount2(""); setAmount3(""); setDate(""); setLabel(""); setPriority("");
  }

  const targetLabel = kind === "income" || kind === "job_loss" ? "Income source"
    : kind === "expense" ? "Expense"
      : kind === "debt" || kind === "debt_payoff" ? "Debt"
        : kind === "goal" ? "Goal"
          : kind === "retirement" ? "Retirement account"
            : kind === "retirement_age" ? "Person"
              : "Insurance exposure";

  return (
    <fieldset className="scenario-composer">
      <legend>Add a scenario assumption</legend>
      <label>
        Assumption type
        <select value={kind} onChange={(event) => { setKind(event.target.value as EditorKind); setTarget(""); setError(""); }}>
          {Object.entries(EDITOR_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      </label>

      {options.length ? (
        <label>
          {targetLabel}
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">Choose…</option>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      ) : null}

      {(kind === "additional_income" || kind === "childcare" || kind === "cash_inflow") ? (
        <label>
          Description
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Optional label" />
        </label>
      ) : null}

      {kind === "income" || kind === "additional_income" || kind === "expense" || kind === "childcare" || kind === "cash_inflow" || kind === "cash_use" || kind === "medical_cash_use" || kind === "job_loss" ? (
        <label>
          {kind === "job_loss" ? "Temporary take-home income" : kind.includes("cash") ? "One-time amount" : "Monthly amount"} (USD)
          <input inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
      ) : null}

      {kind === "additional_income" ? (
        <label>Monthly gross income (USD, optional)<input inputMode="decimal" type="number" min="0" step="0.01" value={amount2} onChange={(event) => setAmount2(event.target.value)} /></label>
      ) : null}

      {kind === "debt" ? (
        <>
          <label>Debt balance (USD, optional)<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Minimum payment (USD/month, optional)<input type="number" min="0" step="0.01" value={amount2} onChange={(event) => setAmount2(event.target.value)} /></label>
          <label>APR (percent, optional)<input type="number" min="0" max="100" step="0.01" value={amount3} onChange={(event) => setAmount3(event.target.value)} /></label>
        </>
      ) : null}

      {kind === "goal" ? (
        <>
          <label>Target amount (USD, optional)<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Target date (optional)<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Priority 1–5 (optional)<input type="number" min="1" max="5" step="1" value={priority} onChange={(event) => setPriority(event.target.value)} /></label>
          <label>Planned contribution (USD/month, optional)<input type="number" min="0" step="0.01" value={amount2} onChange={(event) => setAmount2(event.target.value)} /></label>
        </>
      ) : null}

      {kind === "retirement" ? (
        <>
          <label>Employee contribution (USD/month, optional)<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Annual contribution target (USD/year, optional)<input type="number" min="0" step="0.01" value={amount2} onChange={(event) => setAmount2(event.target.value)} /></label>
        </>
      ) : null}

      {kind === "retirement_age" ? (
        <label>Planned retirement age (years)<input type="number" min="40" max="100" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      ) : null}

      {kind === "insurance" ? (
        <>
          <label>Deductible (USD, optional)<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Family deductible (USD, optional)<input type="number" min="0" step="0.01" value={amount2} onChange={(event) => setAmount2(event.target.value)} /></label>
          <label>Out-of-pocket max (USD, optional)<input type="number" min="0" step="0.01" value={amount3} onChange={(event) => setAmount3(event.target.value)} /></label>
        </>
      ) : null}

      {kind === "planning_preferences" ? (
        <>
          <label>Emergency-fund target (months, optional)<input type="number" min="1" max="12" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Desired retirement spending (USD/month, optional)<input type="number" min="0" step="0.01" value={amount2} onChange={(event) => setAmount2(event.target.value)} /></label>
          <label>Planning Social Security (USD/month, optional)<input type="number" min="0" step="0.01" value={amount3} onChange={(event) => setAmount3(event.target.value)} /></label>
        </>
      ) : null}

      {kind === "job_loss" ? (
        <label>Temporary disruption end date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      ) : null}

      {error ? <p className="scenario-error" role="alert">{error}</p> : null}
      <button type="button" onClick={add}>Add assumption</button>
    </fieldset>
  );
}

function BaselineCard({ bootstrap }: { bootstrap: ScenarioLabBootstrap }) {
  const feasibility = bootstrap.baselineSummary.feasibility;
  return (
    <article className="scenario-result-card">
      <p className="eyebrow">Saved household plan</p>
      <h3>Your current household plan</h3>
      <span className="status-pill">{scenarioStatusLabel(feasibility.status)}</span>
      <div className="scenario-capacity"><span>Available for the monthly plan</span><strong>{money(feasibility.monthlyPlanCapacity)}</strong></div>
      <p><strong>Protected monthly need:</strong> {money(feasibility.protectedMonthlyFundingNeed)}</p>
      <p className="muted">Calculated from your saved financial profile as of {bootstrap.baseline.policyBasis.asOfDate}. Your saved amounts have not changed.</p>
      <details className="scenario-diagnostics"><summary>Technical details</summary><code>{bootstrap.baseline.fingerprint}</code></details>
    </article>
  );
}

function ScenarioResultCard({ draft, bootstrap }: { draft: ScenarioDraft; bootstrap: ScenarioLabBootstrap }) {
  if (draft.specializedResult) {
    return (
      <article className="scenario-result-card">
        <p className="eyebrow">Hypothetical advanced scenario</p>
        <h3>{draft.title}</h3>
        <span className="status-pill">{scenarioStatusLabel(draft.specializedResult.status)}</span>
        <SpecializedScenarioResult result={draft.specializedResult} entities={bootstrap.entities} />
        <p className="muted">Hypothetical only · never applied to your profile.</p>
      </article>
    );
  }
  const result = draft.result;
  if (!result) return (
    <article className="scenario-result-card">
      <p className="eyebrow">Scenario</p><h3>{draft.title}</h3><p className="muted">Run this draft to compare it with your saved household plan.</p>
    </article>
  );
  const baselineCapacity = result.baselineSummary?.feasibility.monthlyPlanCapacity;
  const scenarioCapacity = result.scenarioSummary?.feasibility.monthlyPlanCapacity;
  const change = baselineCapacity !== undefined && scenarioCapacity !== undefined
    ? capacityChange(baselineCapacity, scenarioCapacity)
    : null;
  return (
    <article className="scenario-result-card">
      <p className="eyebrow">Hypothetical scenario</p>
      <h3>{draft.title}</h3>
      <span className="status-pill">{scenarioStatusLabel(result.status)}</span>
      {result.scenarioSummary ? (
        <>
          <p><strong>Calculation:</strong> {scenarioStatusLabel(result.scenarioSummary.feasibility.status)}</p>
          <div className="scenario-capacity"><span>Available under this scenario</span><strong>{money(result.scenarioSummary.feasibility.monthlyPlanCapacity)}</strong></div>
          {change ? <div className="scenario-delta" aria-label="Capacity change"><span>{change.amount >= 0 ? "+" : ""}{money(change.amount)}</span>{change.percentage === null ? null : <span>{change.percentage >= 0 ? "+" : ""}{change.percentage.toFixed(2)}%</span>}</div> : null}
          <p><strong>Funding gap:</strong> {money(result.scenarioSummary.feasibility.planFundingGap)}</p>
          {result.status === "more_information_needed" ? <p className="dashboard-notice"><strong>This calculation ran, but the recommendation is incomplete.</strong> Add the missing information below before treating it as ready.</p> : null}
        </>
      ) : null}
      {result.comparison ? (
        <div>
          <p><strong>Recommendation review:</strong> {refreshStateLabel(result.comparison.state)}</p>
          {result.comparison.reasons.map((reason) => <p className="muted" key={reason}>{reason}</p>)}
          <p><strong>Recommendation changes:</strong> {result.comparison.recommendationChanges.length}</p>
          <p><strong>Allocation changes:</strong> {result.comparison.allocationChanges.length}</p>
          <div className="scenario-change-list">{result.comparison.allocationChanges.slice(0, 4).map((allocation) => {
            const displayName = allocationDisplayName(allocation.allocationId, bootstrap.entities);
            return <div className="scenario-change" key={allocation.allocationId}><p><strong>{displayName ?? "Allocation change"}</strong></p><p>{money(allocation.previousAmount)} → {money(allocation.currentAmount)} <small>({allocation.unit})</small></p>{displayName ? null : <details><summary>Technical identifier</summary><code>{allocation.allocationId}</code></details>}</div>;
          })}</div>
          {result.comparison.warningsAdded.length ? <p><strong>Warnings added:</strong> {result.comparison.warningsAdded.join("; ")}</p> : null}
          {result.comparison.missingDataAdded.length ? <p><strong>Missing data added:</strong> {result.comparison.missingDataAdded.join("; ")}</p> : null}
        </div>
      ) : null}
      {result.issues.length ? <div role="alert"><h4>Check these scenario details</h4><ul>{result.issues.map((item) => <li key={item.path + item.message}>{item.message}<details className="scenario-diagnostics"><summary>Technical details</summary><code>{item.path} · {item.code}</code></details></li>)}</ul></div> : null}
      <p className="muted">Hypothetical only · never applied to your profile.</p>
    </article>
  );
}

export default function ScenarioLabWorkspace({ bootstrap }: { bootstrap: ScenarioLabBootstrap }) {
  const [baseline, setBaseline] = useState(bootstrap);
  const [drafts, setDrafts] = useState<ScenarioDraft[]>([]);
  const [pairComparison, setPairComparison] = useState<ScenarioPairComparisonDTO | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isPending, startTransition] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  const hasDirty = useMemo(() => drafts.some((draft) => draft.dirty), [drafts]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDirty]);

  function announce(message: string) {
    setAnnouncement(message);
    setTimeout(() => resultRef.current?.focus(), 0);
  }

  function createDraft() {
    if (drafts.length >= 2) return;
    const id = localId("scenario");
    setDrafts((current) => [...current, createScenarioDraft(id, baseline.baseline, `Scenario ${current.length + 1}`)]);
    setPairComparison(null);
  }

  function updateDraft(next: ScenarioDraft) {
    setDrafts((current) => replaceDraft(current, next));
    setPairComparison(null);
  }

  function runDraft(draft: ScenarioDraft) {
    startTransition(async () => {
      if (draft.specialized || draft.yourPlanOverrides.length) {
        const specializedResult = await runSpecializedScenarioAction(specializedScenarioSubmission(draft));
        const next = {
          ...draft,
          result: null,
          specializedResult,
          dirty: specializedResult.status === "valid" || specializedResult.status === "more_information_needed" ? false : draft.dirty,
        };
        updateDraft(next);
        announce(`${draft.title} specialized run finished with ${specializedResult.status.replaceAll("_", " ")}.`);
        return;
      }
      const result = await runScenarioAction(submission(draft));
      const next = {
        ...draft,
        result,
        specializedResult: null,
        dirty: result.status === "valid" || result.status === "more_information_needed" ? false : draft.dirty,
      };
      updateDraft(next);
      announce(`${draft.title} run finished with ${result.status.replaceAll("_", " ")}.`);
    });
  }

  function rebaseDraft(draft: ScenarioDraft) {
    startTransition(async () => {
      const result = await rebaseSpecializedScenarioAction(specializedScenarioSubmission(draft));
      if (result.status === "rebased" && result.definition && result.baseline && result.bootstrap) {
        setBaseline(result.bootstrap);
        updateDraft({
          ...draft,
          definition: result.definition.genericDefinition,
          baseline: result.baseline,
          specialized: result.definition.specialized,
          operationEventLinks: [...result.definition.operationEventLinks],
          yourPlanOverrides: [...result.definition.yourPlanOverrides],
          result: null,
          specializedResult: null,
          dirty: true,
        });
      } else {
        const previousSpecialized = draft.specializedResult;
        updateDraft({
          ...draft,
          specializedResult: previousSpecialized ? {
            ...previousSpecialized,
            status: result.status === "unauthorized" ? "unauthorized" : "invalid",
            issues: result.issues,
          } : null,
          result: previousSpecialized ? draft.result : {
            status: result.status === "unauthorized" ? "unauthorized" : "invalid",
            scenarioId: draft.localId,
            baseline: result.baseline,
            baselineSummary: result.baselineSummary,
            scenarioSummary: null,
            issues: result.issues.map((item) => ({ path: item.path, code: "invalid_definition", message: item.message })),
            comparison: null,
            provenance: null,
          },
        });
      }
      announce(`${draft.title} update finished: ${scenarioStatusLabel(result.status)}.`);
    });
  }

  function compareDrafts() {
    if (drafts.length !== 2) return;
    startTransition(async () => {
      const result = await compareScenariosAction({ left: submission(drafts[0]), right: submission(drafts[1]) });
      setPairComparison(result);
      announce(`Scenario comparison finished with ${result.status}.`);
    });
  }

  return (
    <div className="scenario-workspace">
      <div className="scenario-toolbar">
        <div>
          <p className="eyebrow">Draft lifecycle</p>
          <h2>Build up to two what-if scenarios</h2>
          <p className="muted">Run only when you choose. Draft changes stay on this page and never change saved household facts.</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={createDraft} disabled={drafts.length >= 2 || isPending}>Create scenario</button>
          <button type="button" className="secondary-button" onClick={compareDrafts} disabled={drafts.length !== 2 || !scenarioDraftCanCompare(drafts[0], drafts[1]) || isPending}>Compare scenarios</button>
        </div>
      </div>

      <div className="scenario-drafts">
        {drafts.length === 0 ? <p className="empty-state">Create a scenario to begin. Your saved household plan will remain unchanged.</p> : null}
        {drafts.map((draft) => (
          <section className="panel scenario-draft-card" key={draft.localId}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{draft.dirty ? "Draft changes not yet run" : "Temporary scenario"}</p>
                <label>
                  Scenario title
                  <input value={draft.title} onChange={(event) => updateDraft(editScenarioDraft(draft, draft.definition, event.target.value))} />
                </label>
              </div>
              <span className="scenario-status">{scenarioStatusLabel(draft.specializedResult?.status ?? draft.result?.status ?? "not_run")}</span>
            </div>

            <AssumptionComposer draft={draft} bootstrap={baseline} onChange={updateDraft} />
            <details className="scenario-advanced">
              <summary>Advanced scenarios, allocation overrides, and diagnostics</summary>
              <div className="scenario-advanced-content"><SpecializedScenarioControls draft={draft} bootstrap={baseline} onChange={updateDraft} /></div>
            </details>

            <div className="scenario-assumptions" aria-label={`${draft.title} assumptions`}>
              <h3>Assumptions</h3>
              {draft.definition.recurringOverrides.length + draft.definition.oneTimeEvents.length === 0
                ? <p className="muted">No changes yet. A no-op scenario is allowed.</p>
                : [...draft.definition.recurringOverrides, ...draft.definition.oneTimeEvents].map((operation) => {
                    const presentation = scenarioOperationPresentation(operation, baseline.entities);
                    return <article className="scenario-assumption-card" key={operation.id}>
                      <div className="scenario-assumption-heading"><div><p className="eyebrow">{presentation.category}</p><h4>{presentation.title}</h4></div><button type="button" className="secondary-button" onClick={() => updateDraft(removeOperation(draft, operation.id))}>Remove</button></div>
                      {presentation.changes.length ? <div className="scenario-assumption-changes">{presentation.changes.map((change) => <div key={change.label}><span>{change.label}</span><strong>{change.before} → {change.after}</strong>{change.delta ? <small>{change.delta}</small> : null}</div>)}</div> : <p className="muted">This assumption changes non-financial planning details.</p>}
                      <details className="scenario-diagnostics"><summary>Technical details</summary><code>{presentation.diagnosticIds.join(" · ")}</code></details>
                    </article>;
                  })}
            </div>

            <div className="hero-actions">
              <button type="button" onClick={() => runDraft(draft)} disabled={isPending}>{draft.result ? "Rerun" : "Run scenario"}</button>
              {draft.result?.status === "stale_baseline" || draft.specializedResult?.status === "stale_baseline"
                ? <button type="button" className="secondary-button" onClick={() => rebaseDraft(draft)} disabled={isPending}>Update to latest profile</button>
                : null}
              <button type="button" className="secondary-button" onClick={() => updateDraft(resetScenarioDraft(draft, baseline.baseline))} disabled={isPending}>Reset</button>
              <button type="button" className="secondary-button" onClick={() => {
                if (drafts.length >= 2) return;
                const copy = duplicateScenarioDraft(draft, localId("scenario"));
                setDrafts((current) => [...current, copy]);
                setPairComparison(null);
              }} disabled={drafts.length >= 2 || isPending}>Duplicate</button>
              <button type="button" className="secondary-button" onClick={() => {
                if (draft.dirty && !window.confirm("Discard this in-memory draft and its unsaved assumptions?")) return;
                setDrafts((current) => discardScenarioDraft(current, draft.localId));
                setPairComparison(null);
              }} disabled={isPending}>Discard</button>
            </div>
          </section>
        ))}
      </div>

      <section className="panel">
        <p className="eyebrow">Comparison</p>
        <h2>Current plan and what-if results</h2>
        <div className="scenario-comparison-grid">
          <BaselineCard bootstrap={baseline} />
          {drafts.map((draft) => <ScenarioResultCard key={draft.localId} draft={draft} bootstrap={baseline} />)}
        </div>
      </section>

      {pairComparison ? (
        <section className="panel" aria-label="Scenario-to-scenario comparison">
          <p className="eyebrow">Direct scenario comparison</p>
          <h2>{pairComparison.status === "valid" ? "Scenario-to-scenario changes" : "Comparison unavailable"}</h2>
          {pairComparison.comparison ? (
            <>
              <p><strong>Recommendation review:</strong> {refreshStateLabel(pairComparison.comparison.state)}</p>
              {pairComparison.comparison.reasons.map((reason) => <p className="muted" key={reason}>{reason}</p>)}
              <p><strong>Recommendation changes:</strong> {pairComparison.comparison.recommendationChanges.length}</p>
              <p><strong>Allocation deltas:</strong> {pairComparison.comparison.allocationChanges.length}</p>
            </>
          ) : null}
          {pairComparison.issues.length ? <ul>{pairComparison.issues.map((item) => <li key={item.path + item.message}>{item.message}</li>)}</ul> : null}
        </section>
      ) : null}

      <div ref={resultRef} tabIndex={-1} className="scenario-announcement" aria-live="polite" role="status">
        {isPending ? "Scenario Lab is running the current household baseline…" : announcement}
      </div>
    </div>
  );
}
