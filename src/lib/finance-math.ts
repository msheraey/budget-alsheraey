// Shared finance computations used by Dashboard + Reports.
import { CATEGORIES, categoryById } from "@/lib/categories";
import type { Txn } from "@/lib/transactions-store";
import type { CategoryBudget, SavingsGoal } from "@/lib/finance-stores";

export function budgetForFn(budgets: CategoryBudget[]) {
  return (id: string) =>
    budgets.find((b) => b.category === id)?.amount ?? categoryById(id)?.budget ?? 0;
}

export function totalBudgetFor(budgets: CategoryBudget[]) {
  const fn = budgetForFn(budgets);
  return CATEGORIES.filter((c) => c.group !== "income").reduce((s, c) => s + fn(c.id), 0);
}

export function monthRange(y: number, m: number) {
  const startStr = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const endStr = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { startStr, endStr, daysInMonth };
}

export function totalsForMonth(txns: Txn[]) {
  let income = 0, spent = 0, savingsContrib = 0;
  const byCat = new Map<string, number>();
  for (const t of txns) {
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + Number(t.amount));
    if (t.type === "income") income += Number(t.amount);
    else spent += Number(t.amount);
    const c = categoryById(t.category);
    if (c?.group === "savings" && t.type === "expense") savingsContrib += Number(t.amount);
  }
  return { income, spent, savingsContrib, byCat };
}

export function healthScore(args: {
  income: number; spent: number; totalBudget: number;
  savingsBalance: number; monthlyExpenses: number;
}) {
  const adherence = args.totalBudget > 0
    ? Math.max(0, Math.min(100, ((args.totalBudget - Math.max(0, args.spent - args.totalBudget)) / args.totalBudget) * 100))
    : 50;
  const saved = Math.max(0, args.income - args.spent);
  const rateRaw = args.income > 0 ? (saved / args.income) * 100 : 0; // %
  const savings = Math.max(0, Math.min(100, (rateRaw / 20) * 100));   // 20% rate => 100
  const efMonths = args.savingsBalance / Math.max(1, args.monthlyExpenses);
  const emergency = Math.max(0, Math.min(100, (efMonths / 6) * 100));
  const score = Math.round((adherence + savings + emergency) / 3);
  return { score, adherence, savings, emergency, efMonths, savingsRatePct: rateRaw };
}

export function forecast(args: { spent: number; income: number; dayOfMonth: number; daysInMonth: number; isCurrentMonth: boolean }) {
  const dailyPace = args.dayOfMonth > 0 ? args.spent / args.dayOfMonth : 0;
  const forecastSpend = args.isCurrentMonth ? dailyPace * args.daysInMonth : args.spent;
  const forecastSavings = args.income - forecastSpend;
  return { forecastSpend, forecastSavings };
}

// Groups whose spending is genuinely variable day-by-day. Fixed bills,
// annual one-offs, credit-card balances and savings contributions don't
// scale with daily pace, so we project them at face value (current MTD or
// budgeted amount, whichever is higher) instead of multiplying by day count.
export const VARIABLE_GROUPS = new Set(["transport","food","family","health","lifestyle","other"]);

export function forecastByCategory(args: {
  byCat: Map<string, number>;
  budgetFor: (id: string) => number;
  income: number;
  dayOfMonth: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
}) {
  let forecastSpend = 0;
  let variableSpent = 0;
  let variableProjected = 0;
  let fixedProjected = 0;
  for (const c of CATEGORIES) {
    if (c.group === "income") continue;
    const spent = args.byCat.get(c.id) ?? 0;
    const budget = args.budgetFor(c.id);
    if (VARIABLE_GROUPS.has(c.group)) {
      const projected = args.isCurrentMonth && args.dayOfMonth > 0
        ? (spent / args.dayOfMonth) * args.daysInMonth
        : spent;
      forecastSpend += projected;
      variableSpent += spent;
      variableProjected += projected;
    } else {
      // Fixed / annual / credit-cards / savings: don't extrapolate by day.
      // Take whichever is higher: what's been spent so far or what's budgeted.
      const projected = Math.max(spent, budget);
      forecastSpend += projected;
      fixedProjected += projected;
    }
  }
  const forecastSavings = args.income - forecastSpend;
  return { forecastSpend, forecastSavings, variableSpent, variableProjected, fixedProjected };
}


export function topSavingsGoalBalance(goals: SavingsGoal[]) {
  return goals.reduce((s, g) => s + Number(g.current_amount), 0);
}
