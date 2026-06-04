import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet, PiggyBank, CreditCard, TrendingUp, TrendingDown,
  Sparkles, AlertCircle, CheckCircle2, ShieldCheck, ChevronRight,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIES, MONTHS, categoryById, formatAED, type CategoryGroup,
} from "@/lib/categories";
import { useTransactions, type Txn } from "@/lib/transactions-store";
import {
  budgetsStore, debtsStore, goalsStore,
} from "@/lib/finance-stores";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ledger" },
      { name: "description", content: "Family budget overview at a glance." },
    ],
  }),
  component: Dashboard,
});

const START_YEAR = 2026;
const START_MONTH = 5; // June
const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(Date.UTC(START_YEAR, START_MONTH + i, 1));
  return {
    key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
    label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
  };
});

function Dashboard() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    const y = n.getUTCFullYear();
    const m = n.getUTCMonth();
    const before = y < START_YEAR || (y === START_YEAR && m < START_MONTH);
    return before
      ? new Date(Date.UTC(START_YEAR, START_MONTH, 1))
      : new Date(Date.UTC(y, m, 1));
  });

  const { data: all } = useTransactions();
  const { data: budgets } = budgetsStore.useData();
  const { data: goals } = goalsStore.useData();
  const { data: debts } = debtsStore.useData();

  // Budget resolver: DB override → static fallback
  const budgetFor = (id: string) =>
    budgets.find((b) => b.category === id)?.amount ?? categoryById(id)?.budget ?? 0;

  const y = cursor.getUTCFullYear();
  const m = cursor.getUTCMonth();
  const startStr = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const endStr = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const txns = useMemo(
    () => all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr),
    [all, startStr, endStr],
  );

  // Previous month for trends
  const prevStartStr = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const prevTxns = useMemo(
    () => all.filter((t) => t.occurred_on >= prevStartStr && t.occurred_on < startStr),
    [all, prevStartStr, startStr],
  );

  const totals = useMemo(() => {
    const byCat = new Map<string, number>();
    let income = 0;
    let spent = 0;
    let savingsContrib = 0;
    for (const t of txns) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
      if (t.type === "income") income += t.amount;
      else spent += t.amount;
      const cat = categoryById(t.category);
      if (cat?.group === "savings" && t.type === "expense") savingsContrib += t.amount;
    }
    const totalBudget = CATEGORIES.filter((c) => c.group !== "income")
      .reduce((s, c) => s + budgetFor(c.id), 0);
    return { byCat, income, spent, savingsContrib, totalBudget };
  }, [txns, budgets]);

  const prevSpent = useMemo(
    () => prevTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [prevTxns],
  );

  // Today / pacing
  const today = new Date();
  const isCurrentMonth = today.getUTCFullYear() === y && today.getUTCMonth() === m;
  const dayOfMonth = isCurrentMonth ? today.getUTCDate() : daysInMonth;
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);

  const savingsBalance = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
  const availableCash = totals.income - totals.spent;
  const netWorth = availableCash + savingsBalance - totalDebt;

  const remainingBudget = totals.totalBudget - totals.spent;
  const safeToSpend = Math.max(0, remainingBudget) / daysLeft;
  const expectedSpendByNow = (totals.totalBudget / daysInMonth) * dayOfMonth;
  const onTrack = totals.spent <= expectedSpendByNow;

  // Category breakdown (expenses only, sorted)
  const categoryBreakdown = useMemo(() => {
    const rows = CATEGORIES.filter((c) => c.group !== "income")
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        amount: totals.byCat.get(c.id) ?? 0,
        budget: budgetFor(c.id),
        group: c.group,
      }))
      .filter((r) => r.amount > 0 || r.budget > 0)
      .sort((a, b) => b.amount - a.amount);
    const max = Math.max(1, ...rows.map((r) => r.amount));
    return { rows, max };
  }, [totals.byCat, budgets]);

  const totalSpend = totals.spent || 1;
  const monthLabel = `${MONTHS[m]} ${y}`;

  // Smart insights
  const insights = buildInsights({
    totalSpend: totals.spent, prevSpent, byCat: totals.byCat,
    budgetFor, savingsContrib: totals.savingsContrib, onTrack, daysLeft, remainingBudget,
  });

  // Recent activity (last 6)
  const recent = useMemo(() => all.slice(0, 6), [all]);

  return (
    <div className="space-y-6 px-4 pt-6 sm:px-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Family budget
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {monthLabel}
          </h1>
        </div>
        <Select
          value={`${y}-${m}`}
          onValueChange={(v) => {
            const [yy, mm] = v.split("-").map(Number);
            setCursor(new Date(Date.UTC(yy, mm, 1)));
          }}
        >
          <SelectTrigger className="h-10 w-[10rem] rounded-xl border-border bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {/* Top summary — 4 cards */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard
          label="Available Cash" value={availableCash}
          icon={<Wallet className="h-4 w-4" />} tone="primary"
          trend={pctChange(totals.income, prevTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))}
        />
        <MiniCard
          label="Savings" value={savingsBalance}
          icon={<PiggyBank className="h-4 w-4" />} tone="savings"
          trend={totals.savingsContrib > 0 ? 100 : 0}
          trendLabel={totals.savingsContrib > 0 ? `+${formatAED(totals.savingsContrib)} this mo` : "No contrib yet"}
        />
        <MiniCard
          label="Total Debt" value={totalDebt}
          icon={<CreditCard className="h-4 w-4" />} tone="destructive"
          trendLabel={debts.length ? `${debts.length} active` : "Debt-free"}
        />
        <MiniCard
          label="Net Worth" value={netWorth}
          icon={<TrendingUp className="h-4 w-4" />} tone={netWorth >= 0 ? "investment" : "destructive"}
          trendLabel="Cash + Savings − Debt"
        />
      </div>

      {/* Safe-To-Spend hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-widest opacity-80">
            Safe to spend today
          </p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums">
            AED {formatAED(safeToSpend)}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
              {onTrack ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="font-medium">{onTrack ? "On track" : "Overspending"}</span>
            </div>
            <p className="opacity-90 tabular-nums">
              {formatAED(Math.max(0, remainingBudget))} left · {daysLeft} day{daysLeft === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>

      {/* Where did our money go */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">This month</p>
            <h2 className="font-display text-lg font-semibold">Where did our money go?</h2>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            AED <span className="text-foreground font-semibold">{formatAED(totals.spent)}</span>
          </p>
        </div>
        {categoryBreakdown.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No spending logged yet. Tap + to add one.
          </p>
        ) : (
          <ul className="space-y-3">
            {categoryBreakdown.rows.slice(0, 10).map((r) => {
              const Icon = r.icon;
              const pct = (r.amount / categoryBreakdown.max) * 100;
              const share = (r.amount / totalSpend) * 100;
              const overBudget = r.budget > 0 && r.amount > r.budget;
              return (
                <li key={r.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate font-medium">{r.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className={overBudget ? "text-destructive font-semibold" : "font-semibold"}>
                        {formatAED(r.amount)}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {share.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                    <div
                      className={`h-full rounded-full transition-all ${
                        overBudget ? "bg-destructive" : r.group === "savings" ? "bg-savings" : "bg-gradient-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Smart insights */}
      {insights.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-semibold">Smart insights</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`rounded-2xl border border-border bg-card p-4 shadow-card`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ins.bg}`}>
                    <ins.icon className={`h-4 w-4 ${ins.fg}`} />
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Budget vs Actual — top categories */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Budget vs Actual</h2>
          <Link to="/budget" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {topBudgetRows(totals.byCat, budgetFor).map((r) => {
            const diff = r.budget - r.actual;
            const pct = r.budget > 0 ? Math.min(100, (r.actual / r.budget) * 100) : 0;
            const over = diff < 0;
            return (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{r.name}</span>
                  <span className={`tabular-nums font-medium ${over ? "text-destructive" : "text-success"}`}>
                    {over ? "−" : "+"}{formatAED(Math.abs(diff))}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                  <div
                    className={`h-full rounded-full ${over ? "bg-destructive" : "bg-gradient-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span>{formatAED(r.actual)} spent</span>
                  <span>of {formatAED(r.budget)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Emergency fund mini */}
      <EmergencyFundCard
        savingsBalance={savingsBalance}
        monthlyExpenses={Math.max(totals.spent, prevSpent, 1)}
      />

      {/* Recent activity */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          <Link to="/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((t) => <ActivityRow key={t.id} t={t} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- helpers ----------

function pctChange(a: number, b: number) {
  if (!b) return a > 0 ? 100 : 0;
  return ((a - b) / b) * 100;
}

function topBudgetRows(
  byCat: Map<string, number>,
  budgetFor: (id: string) => number,
) {
  return CATEGORIES
    .filter((c) => c.group !== "income")
    .map((c) => ({
      id: c.id,
      name: c.name,
      actual: byCat.get(c.id) ?? 0,
      budget: budgetFor(c.id),
    }))
    .filter((r) => r.budget > 0)
    .sort((a, b) => Math.abs(b.actual - b.budget) - Math.abs(a.actual - a.budget))
    .slice(0, 5);
}

function buildInsights(args: {
  totalSpend: number; prevSpent: number;
  byCat: Map<string, number>; budgetFor: (id: string) => number;
  savingsContrib: number; onTrack: boolean;
  daysLeft: number; remainingBudget: number;
}) {
  type Insight = {
    text: string; icon: typeof Sparkles; bg: string; fg: string;
  };
  const out: Insight[] = [];

  // Compare to last month
  if (args.prevSpent > 0) {
    const change = ((args.totalSpend - args.prevSpent) / args.prevSpent) * 100;
    if (Math.abs(change) >= 5) {
      const up = change > 0;
      out.push({
        text: `Total spending is ${Math.abs(change).toFixed(0)}% ${up ? "higher" : "lower"} than last month.`,
        icon: up ? TrendingUp : TrendingDown,
        bg: up ? "bg-destructive/15" : "bg-success/15",
        fg: up ? "text-destructive" : "text-success",
      });
    }
  }

  // Per-category increase/decrease
  let topCatId = "";
  let topCatAmt = 0;
  for (const [id, amt] of args.byCat.entries()) {
    if (amt > topCatAmt) { topCatAmt = amt; topCatId = id; }
  }
  if (topCatId) {
    const cat = categoryById(topCatId);
    const budget = args.budgetFor(topCatId);
    if (budget > 0 && topCatAmt > budget * 0.8) {
      out.push({
        text: `${cat?.name} is at ${((topCatAmt / budget) * 100).toFixed(0)}% of its budget — your biggest spend so far.`,
        icon: AlertCircle,
        bg: "bg-warning/15",
        fg: "text-warning",
      });
    }
  }

  // Savings
  if (args.savingsContrib > 0) {
    out.push({
      text: `You've moved AED ${formatAED(args.savingsContrib)} to savings this month. Keep it up!`,
      icon: CheckCircle2,
      bg: "bg-savings/15",
      fg: "text-savings",
    });
  }

  // Pace
  if (!args.onTrack) {
    out.push({
      text: `You may exceed your budget in ${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"} at current pace.`,
      icon: AlertCircle,
      bg: "bg-destructive/15",
      fg: "text-destructive",
    });
  }

  return out.slice(0, 4);
}

// ---------- subcomponents ----------

function MiniCard({
  label, value, icon, tone, trend, trendLabel,
}: {
  label: string; value: number; icon: React.ReactNode;
  tone: "primary" | "savings" | "destructive" | "investment";
  trend?: number; trendLabel?: string;
}) {
  const toneClass = {
    primary: "text-primary bg-primary/15",
    savings: "text-savings bg-savings/15",
    destructive: "text-destructive bg-destructive/15",
    investment: "text-investment bg-investment/15",
  }[tone];

  const trendNode = trendLabel ? (
    <p className="mt-1 text-[11px] text-muted-foreground">{trendLabel}</p>
  ) : trend != null ? (
    <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${trend >= 0 ? "text-success" : "text-destructive"}`}>
      {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(trend).toFixed(0)}% vs last
    </p>
  ) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
        <span className="text-xs font-normal text-muted-foreground">AED </span>
        {formatAED(value)}
      </p>
      {trendNode}
    </div>
  );
}

function EmergencyFundCard({ savingsBalance, monthlyExpenses }: { savingsBalance: number; monthlyExpenses: number }) {
  const months = savingsBalance / Math.max(1, monthlyExpenses);
  const targetMonths = 6;
  const pct = Math.min(100, (months / targetMonths) * 100);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-savings" />
          <h2 className="font-display text-lg font-semibold">Emergency fund</h2>
        </div>
        <p className="text-sm tabular-nums">
          <span className="font-display text-xl font-semibold text-savings">{months.toFixed(1)}</span>
          <span className="text-muted-foreground"> / {targetMonths} mo</span>
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full rounded-full bg-gradient-savings" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        AED {formatAED(savingsBalance)} covers ≈{months.toFixed(1)} months of expenses
        (AED {formatAED(monthlyExpenses)}/mo).
      </p>
    </section>
  );
}

function ActivityRow({ t }: { t: Txn }) {
  const cat = categoryById(t.category);
  const Icon = cat?.icon ?? Wallet;
  const isIncome = t.type === "income";
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {t.added_by ? <span className="text-muted-foreground">{t.added_by} · </span> : null}
          {cat?.name ?? t.category}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {new Date(t.occurred_on).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}
          {t.payment_method ? ` · ${t.payment_method}` : ""}
        </p>
      </div>
      <p className={`shrink-0 font-display text-sm font-semibold tabular-nums ${isIncome ? "text-success" : "text-foreground"}`}>
        {isIncome ? "+" : "−"} {formatAED(t.amount)}
      </p>
    </li>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Unused = CategoryGroup;
