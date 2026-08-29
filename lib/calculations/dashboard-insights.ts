export type NamedAmount = {
  name: string;
  amount: number;
};

export type CategoryAmount = {
  category: string;
  amount: number;
};

export type GoalProgressInput = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  priority: number;
};

export type GoalProgress = GoalProgressInput & {
  progress: number;
  remaining: number;
};

export type FinancialHealthInput = {
  completion: number;
  monthlyIncome: number;
  monthlyCashFlow: number;
  savingsRate: number | null;
  totalDebt: number;
  retirementAssets: number;
  goalCount: number;
};

export type FinancialHealthSummary = {
  status: "Needs data" | "Needs attention" | "Building" | "Strong";
  score: number | null;
  message: string;
};

export function sumAmounts(items: NamedAmount[]) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function groupCategoryAmounts(items: CategoryAmount[]) {
  const grouped = new Map<string, number>();

  for (const item of items) {
    grouped.set(item.category, (grouped.get(item.category) ?? 0) + Number(item.amount || 0));
  }

  return [...grouped.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculateGoalProgress(goals: GoalProgressInput[]): GoalProgress[] {
  return goals
    .map((goal) => {
      const target = Math.max(0, Number(goal.targetAmount || 0));
      const current = Math.max(0, Number(goal.currentAmount || 0));
      const progress = target > 0 ? Math.min(1, current / target) : 0;

      return {
        ...goal,
        currentAmount: current,
        targetAmount: target,
        progress,
        remaining: Math.max(0, target - current),
      };
    })
    .sort((a, b) => a.priority - b.priority || b.progress - a.progress);
}

export function profileCompletion(sectionCounts: number[]) {
  if (!sectionCounts.length) return 0;
  const completed = sectionCounts.filter((count) => count > 0).length;
  return Math.round((completed / sectionCounts.length) * 100);
}

export function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthSummary {
  if (input.completion < 50 || input.monthlyIncome <= 0 || input.savingsRate === null) {
    return {
      status: "Needs data",
      score: null,
      message: "Complete more of your financial profile before treating this summary as meaningful.",
    };
  }

  let score = 0;
  score += Math.round(Math.min(30, Math.max(0, input.savingsRate) * 100));
  score += input.monthlyCashFlow > 0 ? 25 : input.monthlyCashFlow === 0 ? 12 : 0;
  score += input.retirementAssets > 0 ? 20 : 0;
  score += input.goalCount > 0 ? 10 : 0;
  score += input.completion >= 100 ? 15 : input.completion >= 80 ? 10 : 5;
  score = Math.min(100, score);

  if (score >= 75) {
    return { status: "Strong", score, message: "Your current profile shows positive financial momentum across several core areas." };
  }
  if (score >= 50) {
    return { status: "Building", score, message: "Your foundation is taking shape, with room to strengthen cash flow, saving, or long-term progress." };
  }
  return { status: "Needs attention", score, message: "Your current numbers suggest focusing on cash flow and core financial foundations before adding complexity." };
}
