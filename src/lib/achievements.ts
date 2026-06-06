// Dynamic achievement evaluation. Computes which badges are unlocked from
// the user's actual data — no DB writes required for them to "light up".

import {
  Award, Sparkles, Flame, ShieldCheck, PiggyBank, Trophy, Target,
  TrendingUp, CalendarCheck, Coins, BadgeCheck, Rocket, Crown,
  Gem, Banknote, Zap, HeartHandshake, Leaf, Wallet, Calculator,
  Receipt, BookOpen, type LucideIcon,
} from "lucide-react";
import { categoryById } from "@/lib/categories";
import type { Txn } from "@/lib/transactions-store";
import type { SavingsGoal, Debt, CategoryBudget } from "@/lib/finance-stores";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface BadgeDef {
  key: string;
  title: string;
  desc: string;
  tier: Tier;
  icon: LucideIcon;
  group: string;
}

export interface BadgeProgress {
  badge: BadgeDef;
  unlocked: boolean;
  progress: number;   // 0..1
  current: number;
  target: number;
  unit?: string;
}

export const BADGE_TIER_STYLE: Record<Tier, { ring: string; bg: string; text: string }> = {
  bronze:   { ring: "ring-amber-700/40",   bg: "bg-gradient-to-br from-amber-600 to-amber-800",     text: "text-white" },
  silver:   { ring: "ring-slate-400/40",   bg: "bg-gradient-to-br from-slate-300 to-slate-500",     text: "text-slate-900" },
  gold:     { ring: "ring-yellow-400/40",  bg: "bg-gradient-to-br from-yellow-300 to-amber-500",    text: "text-yellow-950" },
  platinum: { ring: "ring-violet-400/40",  bg: "bg-gradient-to-br from-violet-300 via-fuchsia-300 to-cyan-300", text: "text-violet-950" },
};

export const BADGES: BadgeDef[] = [
  // Getting started
  { key: "first_txn",          title: "First Steps",         desc: "Log your first transaction",            tier: "bronze",   icon: Sparkles,    group: "Getting started" },
  { key: "ten_txn",            title: "Getting Going",       desc: "Log 10 transactions",                   tier: "bronze",   icon: BookOpen,    group: "Getting started" },
  { key: "fifty_txn",          title: "Bookkeeper",          desc: "Log 50 transactions",                   tier: "silver",   icon: Receipt,     group: "Getting started" },
  { key: "hundred_txn",        title: "Ledger Pro",          desc: "Log 100 transactions",                  tier: "gold",     icon: Award,       group: "Getting started" },
  { key: "fivehundred_txn",    title: "Audit Trail",         desc: "Log 500 transactions",                  tier: "platinum", icon: BadgeCheck,  group: "Getting started" },

  // Consistency
  { key: "week_logger",        title: "Daily Habit",         desc: "Log on 7 different days",               tier: "bronze",   icon: CalendarCheck, group: "Consistency" },
  { key: "month_logger",       title: "Steady Hand",         desc: "Log on 20 days in a month",             tier: "silver",   icon: CalendarCheck, group: "Consistency" },
  { key: "three_month_active", title: "Quarterly",           desc: "Active in 3 different months",          tier: "silver",   icon: Flame,       group: "Consistency" },
  { key: "six_month_active",   title: "Half-year Habit",     desc: "Active in 6 different months",          tier: "gold",     icon: Flame,       group: "Consistency" },
  { key: "year_active",        title: "Yearbook",            desc: "Active in 12 different months",         tier: "platinum", icon: Crown,       group: "Consistency" },

  // Budgeting
  { key: "set_budget",         title: "Plan Maker",          desc: "Set a budget for any category",         tier: "bronze",   icon: Calculator,  group: "Budgeting" },
  { key: "budget_5",           title: "Planner",             desc: "Set budgets in 5 categories",           tier: "silver",   icon: Calculator,  group: "Budgeting" },
  { key: "budget_15",          title: "Architect",           desc: "Set budgets in 15 categories",          tier: "gold",     icon: Calculator,  group: "Budgeting" },
  { key: "under_budget_month", title: "Disciplined",         desc: "1 full month under total budget",       tier: "silver",   icon: ShieldCheck, group: "Budgeting" },
  { key: "under_budget_3",     title: "Streak Master",       desc: "3 months under budget in a row",        tier: "gold",     icon: Flame,       group: "Budgeting" },
  { key: "under_budget_6",     title: "Iron Will",           desc: "6 months under budget in a row",        tier: "platinum", icon: Crown,       group: "Budgeting" },
  { key: "no_misc_month",      title: "Tagged Up",           desc: "A month with under 5% miscellaneous",   tier: "silver",   icon: Target,      group: "Budgeting" },

  // Saving
  { key: "first_save",         title: "Piggy Bank",          desc: "Save your first AED",                   tier: "bronze",   icon: PiggyBank,   group: "Saving" },
  { key: "save_1k",            title: "First Thousand",      desc: "Save AED 1,000 total",                  tier: "bronze",   icon: Coins,       group: "Saving" },
  { key: "save_5k",            title: "Buffer Built",        desc: "Save AED 5,000 total",                  tier: "silver",   icon: Coins,       group: "Saving" },
  { key: "save_10k",           title: "Five Figures",        desc: "Save AED 10,000 total",                 tier: "gold",     icon: Banknote,    group: "Saving" },
  { key: "save_50k",           title: "Net Worth Builder",   desc: "Save AED 50,000 total",                 tier: "platinum", icon: Gem,         group: "Saving" },
  { key: "save_100k",          title: "Six Figures",         desc: "Save AED 100,000 total",                tier: "platinum", icon: Crown,       group: "Saving" },
  { key: "savings_rate_10",    title: "Saver",               desc: "Hit a 10% savings rate in a month",     tier: "bronze",   icon: TrendingUp,  group: "Saving" },
  { key: "savings_rate_20",    title: "Healthy Saver",       desc: "Hit a 20% savings rate in a month",     tier: "silver",   icon: TrendingUp,  group: "Saving" },
  { key: "savings_rate_30",    title: "Power Saver",         desc: "Hit a 30% savings rate in a month",     tier: "gold",     icon: Rocket,      group: "Saving" },
  { key: "savings_rate_50",    title: "FIRE Track",          desc: "Hit a 50% savings rate in a month",     tier: "platinum", icon: Zap,         group: "Saving" },

  // Goals
  { key: "first_goal",         title: "Dreamer",             desc: "Create your first savings goal",        tier: "bronze",   icon: Target,      group: "Goals" },
  { key: "goal_25",            title: "Off the Mark",        desc: "Reach 25% on a goal",                   tier: "bronze",   icon: Target,      group: "Goals" },
  { key: "goal_50",            title: "Halfway There",       desc: "Reach 50% on a goal",                   tier: "silver",   icon: Target,      group: "Goals" },
  { key: "goal_75",            title: "Almost There",        desc: "Reach 75% on a goal",                   tier: "silver",   icon: Target,      group: "Goals" },
  { key: "goal_complete",      title: "Goal Crusher",        desc: "Complete a savings goal",               tier: "gold",     icon: Trophy,      group: "Goals" },
  { key: "three_goals",        title: "Multi-tracker",       desc: "Have 3 active goals at once",           tier: "silver",   icon: Target,      group: "Goals" },
  { key: "three_goals_done",   title: "Achiever",            desc: "Complete 3 goals",                      tier: "platinum", icon: Crown,       group: "Goals" },

  // Debt
  { key: "debt_logged",        title: "Eyes Open",           desc: "Track a debt",                          tier: "bronze",   icon: Wallet,      group: "Debt" },
  { key: "debt_25",            title: "Chipping Away",       desc: "Pay down 25% of any debt",              tier: "bronze",   icon: Wallet,      group: "Debt" },
  { key: "debt_half",          title: "Halfway Free",        desc: "Pay down 50% of any debt",              tier: "silver",   icon: ShieldCheck, group: "Debt" },
  { key: "debt_clear",         title: "Debt Slayer",         desc: "Clear a debt completely",               tier: "gold",     icon: Trophy,      group: "Debt" },
  { key: "debt_free",          title: "Debt Free",           desc: "Zero tracked debt",                     tier: "platinum", icon: Crown,       group: "Debt" },

  // Lifestyle
  { key: "charity",            title: "Generous Heart",      desc: "Log a charity contribution",            tier: "bronze",   icon: HeartHandshake, group: "Lifestyle" },
  { key: "low_delivery",       title: "Home Cook",           desc: "Spend under AED 200 on delivery in a month", tier: "silver", icon: Leaf, group: "Lifestyle" },
  { key: "no_eatout_week",     title: "Kitchen Champion",    desc: "7 days with no eat-out spend",          tier: "bronze",   icon: Leaf,        group: "Lifestyle" },
];

function monthKey(d: string) { return d.slice(0, 7); } // YYYY-MM

export function evaluateAchievements(args: {
  txns: Txn[];
  goals: SavingsGoal[];
  debts: Debt[];
  budgets: CategoryBudget[];
}): BadgeProgress[] {
  const { txns, goals, debts, budgets } = args;

  // ----- aggregations -----
  const totalTxn = txns.length;

  const dayBuckets = new Set(txns.map((t) => t.occurred_on));
  const monthBuckets = new Set(txns.map((t) => monthKey(t.occurred_on)));

  // per-month: income, spent, savingsContrib, totalBudget, miscShare, days
  const monthsMap = new Map<string, { income: number; spent: number; savings: number; misc: number; days: Set<string> }>();
  for (const t of txns) {
    const k = monthKey(t.occurred_on);
    let row = monthsMap.get(k);
    if (!row) { row = { income: 0, spent: 0, savings: 0, misc: 0, days: new Set() }; monthsMap.set(k, row); }
    row.days.add(t.occurred_on);
    const amt = Number(t.amount);
    const cat = categoryById(t.category);
    if (t.type === "income") row.income += amt;
    else {
      row.spent += amt;
      if (cat?.group === "savings") row.savings += amt;
      if (t.category === "miscellaneous" || !cat) row.misc += amt;
    }
  }

  let bestSavingsRate = 0;
  let underBudgetMonths = 0;
  let underBudgetStreakMax = 0, underBudgetStreakCur = 0;
  let monthsWith20Days = 0;
  let monthsLowMisc = 0;
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const sortedKeys = [...monthsMap.keys()].sort();
  for (const k of sortedKeys) {
    const r = monthsMap.get(k)!;
    if (r.income > 0) {
      const rate = ((r.income - r.spent) / r.income) * 100;
      if (rate > bestSavingsRate) bestSavingsRate = rate;
    }
    if (totalBudget > 0 && r.spent <= totalBudget && r.spent > 0) {
      underBudgetMonths += 1;
      underBudgetStreakCur += 1;
      underBudgetStreakMax = Math.max(underBudgetStreakMax, underBudgetStreakCur);
    } else {
      underBudgetStreakCur = 0;
    }
    if (r.days.size >= 20) monthsWith20Days += 1;
    if (r.spent > 0 && (r.misc / r.spent) * 100 < 5) monthsLowMisc += 1;
  }

  const savingsBalance = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalSaved = Math.max(
    savingsBalance,
    [...monthsMap.values()].reduce((s, r) => s + r.savings, 0),
  );

  // Goals progress
  const goalsCompleted = goals.filter((g) => Number(g.target_amount) > 0 && Number(g.current_amount) >= Number(g.target_amount)).length;
  const bestGoalPct = goals.reduce((best, g) => {
    if (Number(g.target_amount) <= 0) return best;
    return Math.max(best, (Number(g.current_amount) / Number(g.target_amount)) * 100);
  }, 0);

  // Debt progress
  const bestDebtPaidPct = debts.reduce((best, d) => {
    const orig = Number(d.original_amount);
    if (orig <= 0) return best;
    const paid = Math.max(0, orig - Number(d.balance));
    return Math.max(best, (paid / orig) * 100);
  }, 0);
  const clearedDebt = debts.some((d) => Number(d.balance) <= 0);
  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);

  // Lifestyle bits
  const charityLogged = txns.some((t) => t.category === "charity");
  const lowDeliveryMonth = [...monthsMap.entries()].some(([k]) => {
    const total = txns.filter((t) => monthKey(t.occurred_on) === k && t.category === "food-delivery")
      .reduce((s, t) => s + Number(t.amount), 0);
    return total > 0 && total < 200;
  });
  const eatOutDates = new Set(txns.filter((t) => t.category === "eat-out").map((t) => t.occurred_on));
  // 7 consecutive days with at least one txn but no eat-out
  let noEatOutWeek = false;
  if (dayBuckets.size > 0) {
    const days = [...dayBuckets].sort();
    let streak = 0;
    for (const d of days) {
      if (eatOutDates.has(d)) streak = 0;
      else { streak += 1; if (streak >= 7) { noEatOutWeek = true; break; } }
    }
  }

  // ----- map evaluation -----
  const ratio = (cur: number, target: number) => Math.max(0, Math.min(1, target > 0 ? cur / target : 0));

  const checks: Record<string, { current: number; target: number; unit?: string }> = {
    first_txn:          { current: totalTxn, target: 1, unit: "txn" },
    ten_txn:            { current: totalTxn, target: 10, unit: "txn" },
    fifty_txn:          { current: totalTxn, target: 50, unit: "txn" },
    hundred_txn:        { current: totalTxn, target: 100, unit: "txn" },
    fivehundred_txn:    { current: totalTxn, target: 500, unit: "txn" },

    week_logger:        { current: dayBuckets.size, target: 7, unit: "days" },
    month_logger:       { current: monthsWith20Days > 0 ? 20 : Math.max(...[...monthsMap.values()].map((r) => r.days.size), 0), target: 20, unit: "days" },
    three_month_active: { current: monthBuckets.size, target: 3, unit: "months" },
    six_month_active:   { current: monthBuckets.size, target: 6, unit: "months" },
    year_active:        { current: monthBuckets.size, target: 12, unit: "months" },

    set_budget:         { current: budgets.length, target: 1 },
    budget_5:           { current: budgets.length, target: 5 },
    budget_15:          { current: budgets.length, target: 15 },
    under_budget_month: { current: underBudgetMonths, target: 1 },
    under_budget_3:     { current: underBudgetStreakMax, target: 3 },
    under_budget_6:     { current: underBudgetStreakMax, target: 6 },
    no_misc_month:      { current: monthsLowMisc, target: 1 },

    first_save:         { current: totalSaved > 0 ? 1 : 0, target: 1 },
    save_1k:            { current: totalSaved, target: 1_000, unit: "AED" },
    save_5k:            { current: totalSaved, target: 5_000, unit: "AED" },
    save_10k:           { current: totalSaved, target: 10_000, unit: "AED" },
    save_50k:           { current: totalSaved, target: 50_000, unit: "AED" },
    save_100k:          { current: totalSaved, target: 100_000, unit: "AED" },
    savings_rate_10:    { current: bestSavingsRate, target: 10, unit: "%" },
    savings_rate_20:    { current: bestSavingsRate, target: 20, unit: "%" },
    savings_rate_30:    { current: bestSavingsRate, target: 30, unit: "%" },
    savings_rate_50:    { current: bestSavingsRate, target: 50, unit: "%" },

    first_goal:         { current: goals.length, target: 1 },
    goal_25:            { current: bestGoalPct, target: 25, unit: "%" },
    goal_50:            { current: bestGoalPct, target: 50, unit: "%" },
    goal_75:            { current: bestGoalPct, target: 75, unit: "%" },
    goal_complete:      { current: goalsCompleted, target: 1 },
    three_goals:        { current: goals.length, target: 3 },
    three_goals_done:   { current: goalsCompleted, target: 3 },

    debt_logged:        { current: debts.length, target: 1 },
    debt_25:            { current: bestDebtPaidPct, target: 25, unit: "%" },
    debt_half:          { current: bestDebtPaidPct, target: 50, unit: "%" },
    debt_clear:         { current: clearedDebt ? 1 : 0, target: 1 },
    debt_free:          { current: debts.length > 0 && totalDebt === 0 ? 1 : 0, target: 1 },

    charity:            { current: charityLogged ? 1 : 0, target: 1 },
    low_delivery:       { current: lowDeliveryMonth ? 1 : 0, target: 1 },
    no_eatout_week:     { current: noEatOutWeek ? 1 : 0, target: 1 },
  };

  return BADGES.map((b) => {
    const c = checks[b.key] ?? { current: 0, target: 1 };
    const progress = ratio(c.current, c.target);
    return {
      badge: b,
      unlocked: progress >= 1,
      progress,
      current: c.current,
      target: c.target,
      unit: c.unit,
    };
  });
}

export const BADGE_GROUPS = [
  "Getting started", "Consistency", "Budgeting", "Saving",
  "Goals", "Debt", "Lifestyle",
];
