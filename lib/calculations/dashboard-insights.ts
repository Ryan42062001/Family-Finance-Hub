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
