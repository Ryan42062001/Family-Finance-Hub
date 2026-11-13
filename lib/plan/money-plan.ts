// Presentation layer for "Your money plan". It turns the Money Priority Engine result into steps people can read.
// It never changes amounts, order or rules: amounts are summed from the engine's own allocations, the order is the
// engine's rank, and wording changes only replace internal labels (kept available as "technical wording").
import type { MoneyPriorityEngineResult, MoneyPriorityRecommendation, RecommendationState } from "../calculations/money-priority-engine.ts";
import type { MoneyPrioritySnapshot } from "../calculations/money-priority-snapshot.ts";
import { calculateEmergencyFund } from "../calculations/emergency-fund.ts";
import { projectDebtStrategy } from "../calculations/debt-payoff.ts";

export type PlanStep = {
  id: string;
  rank: number;
  title: string;
  state: RecommendationState;
  stateLabel: string;
  monthlyAmount: number | null; // null when the engine attached no allocation (or an invalid one)
  destinations: string[];
  explanation: string;
  whyNow: string[];
  tradeoffs: string[];
  assumptions: string[];
  technical: string | null; // original wording when it was rewritten for people
};

export type MissingItem = { text: string; href: string | null; fixHint: string };

export type MissingGroup = { title: string | null; items: MissingItem[] };

export type MoneyPlanView = {
  asOfDate: string;
  feasibility: { status: "feasible" | "tight" | "funding_gap"; label: string; monthlyPlanCapacity: number; protectedNeed: number; fundingGap: number };
  steps: PlanStep[]; // actionable: recommended and worth considering, in engine rank order
  needsInformation: PlanStep[]; // more_information_needed, in engine rank order
  missing: MissingGroup[]; // one group per "needs more information" step, then facts other steps asked for
  missingCount: number;
  notes: string[];
};

const STATE_LABEL: Record<RecommendationState, string> = {
  recommended: "Recommended",
  worth_considering: "Worth considering",
  more_information_needed: "Needs more information",
};

// Internal policy labels that mean nothing to a household. Removing them does not change the meaning.
const INTERNAL_LABELS: Array<[RegExp, string]> = [
  [/\s*\(?FFH-D\d+\)?\s*/g, " "],
  [/\bPhase 5[A-C]\s+/g, ""],
  [/\bStage 1\b/g, "the first safety step"],
  [/\bBuild-stage\b/g, "longer-term"],
  [/\bBuild routing\b/g, "planning"],
  [/\s{2,}/g, " "],
];

// Plain-language versions of the engine's most common sentences. Exact-sentence matches only, so a sentence the
// table doesn't know is shown as written. Meaning is kept; the original stays available as "technical wording".
const PLAIN_SENTENCES: Record<string, string> = {
  "APR is at or above the high-interest threshold.": "This debt's interest rate is high, so paying it down is a strong use of extra money.",
  "APR falls in the payoff-favored range.": "This debt's interest rate is high enough that paying it off faster usually pays off.",
  "APR starts in the split/payoff-favored posture.": "Splitting extra money between this debt and investing is reasonable.",
  "A 25+ year retirement horizon modestly favors investing flexibility.": "With 25 or more years until retirement, keeping some money invested also makes sense.",
  "Household income is concentrated in one primary source.": "Most of your income comes from one source, so a bigger cushion is safer.",
  "Protected reserve cash is one shared reserve pool: deductible coverage counts toward the full emergency target rather than being subtracted twice.": "Money kept for insurance deductibles counts toward this emergency fund, not on top of it.",
  "The protected retirement floor is funded before ordinary goal competition.": "Your basic retirement saving comes before other goals.",
  "Only verified additional retirement opportunity above that floor participates in competition.": "Extra retirement saving beyond that basic amount competes with your other goals.",
  "Retirement planning need that is not currently legally routable remains descriptive and cannot create phantom allocation.": "If no account has room for more retirement saving, the plan shows the need but doesn't assign money to it.",
  "Employer-match availability is unknown.": "We don't know yet whether your employer matches your contributions.",
  "The deductible reserve target cannot be verified without deductible data.": "Add your insurance deductibles so the plan can size your safety cushion.",
  "Contribution room cannot yet be translated into an account-specific allocation safely.": "The plan needs a few more retirement account details before it can say which account to use.",
  "Projection results are planning estimates, not guarantees.": "These are planning estimates, not guarantees.",
};

function plainSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text];
  return sentences.map((sentence) => PLAIN_SENTENCES[sentence.trim()] ?? sentence.trim()).join(" ");
}

export function forPeople(text: string): string {
  let out = text;
  for (const [pattern, replacement] of INTERNAL_LABELS) out = out.replace(pattern, replacement);
  return plainSentences(out.trim()).trim();
}

function allocationTotal(recommendation: MoneyPriorityRecommendation): number | null {
  if (!recommendation.allocations.length) return null;
  let total = 0;
  for (const allocation of recommendation.allocations) {
    if (!Number.isFinite(allocation.monthlyAmount) || allocation.monthlyAmount < 0) return null; // fail closed
    total += allocation.monthlyAmount;
  }
  return Math.round(total * 100) / 100;
}

function entityNames(snapshot: MoneyPrioritySnapshot): Map<string, string> {
  const names = new Map<string, string>();
  for (const list of [snapshot.accounts, snapshot.debts, snapshot.goals, snapshot.retirementAccounts, snapshot.income, snapshot.expenses]) {
    for (const item of list as Array<{ id: string; name: string }>) names.set(item.id, item.name);
  }
  return names;
}

const CATEGORY_LABEL: Record<string, string> = {
  debt: "Debt payment", reserve: "Emergency reserve", retirement: "Retirement", goal: "Goal", investing: "Investing",
};

function toStep(recommendation: MoneyPriorityRecommendation, names: Map<string, string>): PlanStep {
  const explanation = forPeople(recommendation.explanation);
  const destinations = recommendation.allocations.map((allocation) => {
    const name = allocation.relatedEntityId ? names.get(allocation.relatedEntityId) : undefined;
    return name ?? CATEGORY_LABEL[allocation.category] ?? allocation.category.replaceAll("_", " ");
  });
  return {
    id: recommendation.id,
    rank: recommendation.rank,
    title: forPeople(recommendation.title),
    state: recommendation.state,
    stateLabel: STATE_LABEL[recommendation.state],
    monthlyAmount: allocationTotal(recommendation),
    destinations: [...new Set(destinations)],
    explanation,
    whyNow: recommendation.whyNow.map(forPeople),
    tradeoffs: recommendation.tradeoffs.map(forPeople),
    assumptions: recommendation.assumptions.map(forPeople),
    technical: explanation !== recommendation.explanation.trim() ? recommendation.explanation : null,
  };
}

// Where a household can supply a missing fact today. Facts with no editor in the app say so honestly; the
// "not yet" routes come first so a generic word like "retirement" never sends someone to a form that can't help.
const MISSING_ROUTES: Array<{ match: RegExp; href: string | null; fixHint: string }> = [
  { match: /\bHSA\b/, href: "/financial-profile/hsa", fixHint: "Add it on the HSA details page" },
  { match: /SIMPLE IRA/i, href: "/financial-profile/simple", fixHint: "Add it on the SIMPLE IRA page" },
  // Still not recordable in the app.
  { match: /catch-up|prior[- ]year|SEP|self-employment|Medicare|tax filing|modified AGI|spouse/i, href: null, fixHint: "The app can't record this detail yet" },
  // Recordable since FFH-P03.
  { match: /deductible|insurance/i, href: "/financial-profile#insurance", fixHint: "Add it under Insurance in Financial profile" },
  { match: /employer[- ]match|full match/i, href: "/financial-profile#retirement", fixHint: "Add it under the account's More details" },
  { match: /YTD|year-to-date|compensation|elective[- ]deferral|annual[- ]additions|contribution room/i, href: "/financial-profile#retirement", fixHint: "Add it under the account's More details" },
  { match: /retirement spending|today's dollars|Social Security|pension/i, href: "/financial-profile#retirement", fixHint: "Add it under Retirement goals" },
  { match: /gross (income|pay)|gross amount|pre-tax income/i, href: "/financial-profile#income", fixHint: "Add gross pay to the income" },
  { match: /cash purpose|reserve designation|protected reserve/i, href: "/financial-profile#accounts", fixHint: "Set what the account's cash is for" },
  { match: /goal|deadline|consequence|underlying (household )?need|core[- ]need|desired solution|borrowing/i, href: "/financial-profile#goals", fixHint: "Edit the goal in Financial profile" },
  { match: /interest rate|APR|minimum payment|debt|loan/i, href: "/financial-profile#debts", fixHint: "Edit the debt in Financial profile" },
  { match: /monthly (employee |employer )?contribution|retirement|401\(k\)|403\(b\)|IRA/i, href: "/financial-profile#retirement", fixHint: "Edit the account in Financial profile" },
  { match: /take-home|income|paycheck|salary/i, href: "/financial-profile#income", fixHint: "Edit income in Financial profile" },
  { match: /expense|spending/i, href: "/financial-profile#expenses", fixHint: "Edit expenses in Financial profile" },
  { match: /account balance|balance|savings|checking/i, href: "/financial-profile#accounts", fixHint: "Edit accounts in Financial profile" },
];
export function missingItem(text: string): MissingItem {
  const route = MISSING_ROUTES.find((candidate) => candidate.match.test(text));
  return { text: forPeople(text), href: route?.href ?? null, fixHint: route?.fixHint ?? "Review your Financial profile" };
}

const FEASIBILITY_LABEL = {
  feasible: "Your plan fits your monthly money",
  tight: "Your plan is tight this month",
  funding_gap: "Your plan has a funding gap",
} as const;

export function buildMoneyPlanView(result: MoneyPriorityEngineResult): MoneyPlanView {
  const names = entityNames(result.snapshot);
  const ordered = [...result.recommendations].sort((a, b) => a.rank - b.rank);
  const steps = ordered.filter((r) => r.state !== "more_information_needed").map((r) => toStep(r, names));
  const needsInformation = ordered.filter((r) => r.state === "more_information_needed").map((r) => toStep(r, names));
  const seen = new Set<string>();
  const take = (texts: string[]) => texts.filter((text) => !seen.has(text) && seen.add(text)).map(missingItem);
  const missing: MissingGroup[] = [];
  for (const recommendation of ordered.filter((r) => r.state === "more_information_needed")) {
    const items = take(recommendation.missingData.length ? recommendation.missingData : [recommendation.explanation]);
    missing.push({ title: forPeople(recommendation.title), items });
  }
  const other = take(ordered.filter((r) => r.state !== "more_information_needed").flatMap((r) => r.missingData));
  if (other.length) missing.push({ title: null, items: other });
  return {
    asOfDate: result.asOfDate,
    feasibility: {
      status: result.feasibility.status,
      label: FEASIBILITY_LABEL[result.feasibility.status],
      monthlyPlanCapacity: result.feasibility.monthlyPlanCapacity,
      protectedNeed: result.feasibility.protectedMonthlyFundingNeed,
      fundingGap: result.feasibility.planFundingGap,
    },
    steps,
    needsInformation,
    missing,
    missingCount: seen.size,
    notes: [...new Set(result.warnings.map(forPeople))],
  };
}

// ---- Headline badges (existing calculations only) ----

export type CushionBadge = { kind: "months"; months: number } | { kind: "unavailable"; reason: string };
export type DebtFreeBadge =
  | { kind: "none" }
  | { kind: "date"; months: number; date: string }
  | { kind: "not_reached" }
  | { kind: "unavailable"; reason: string };

// Months of essential spending (essential expenses + debt minimums) covered by liquid cash: the same definition the
// emergency-fund planner uses.
export function cushionBadge(snapshot: MoneyPrioritySnapshot): CushionBadge {
  const essentials = snapshot.aggregates.monthlyEssentialExpenses + snapshot.aggregates.monthlyMinimumDebtPayments;
  if (!Number.isFinite(essentials) || essentials <= 0) return { kind: "unavailable", reason: "Add essential expenses to see your cushion" };
  const result = calculateEmergencyFund({ currentSavings: snapshot.aggregates.liquidCash, monthlyEssentialExpenses: essentials, targetMonths: 0 });
  return result.coverageMonths === null ? { kind: "unavailable", reason: "Add essential expenses to see your cushion" } : { kind: "months", months: result.coverageMonths };
}

function addMonths(isoDate: string, months: number): string {
  const [year, month] = isoDate.split("-").map(Number);
  const total = (year * 12 + (month - 1)) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

// Debt-free month at current minimum payments (no extra), using the existing payoff projection. Unknown interest
// rates fail closed: no date is shown.
export function debtFreeBadge(snapshot: MoneyPrioritySnapshot, asOfDate: string): DebtFreeBadge {
  const debts = snapshot.debts.filter((debt) => debt.balance > 0);
  if (!debts.length) return { kind: "none" };
  if (debts.some((debt) => debt.annualInterestRate === null || !Number.isFinite(debt.annualInterestRate))) {
    return { kind: "unavailable", reason: "Add an interest rate to every debt to see a debt-free date" };
  }
  const projection = projectDebtStrategy(
    debts.map((debt) => ({ id: debt.id, name: debt.name, balance: debt.balance, annualInterestRate: debt.annualInterestRate as number, minimumPayment: debt.minimumPayment })),
    0,
    "avalanche",
  );
  if (!projection.payoffPossible || projection.months === null) return { kind: "not_reached" };
  return { kind: "date", months: projection.months, date: addMonths(asOfDate, projection.months) };
}
