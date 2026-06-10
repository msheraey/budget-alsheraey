import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet, PiggyBank, CreditCard, TrendingUp, TrendingDown,
  Sparkles, AlertCircle, CheckCircle2, ShieldCheck, ChevronRight,
  ArrowDownRight, ArrowUpRight, Activity, CalendarClock, Target,
  AlertTriangle, Plus, Trash2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES, MONTHS, MEMBERS, categoryById, formatAED,
} from "@/lib/categories";
import { useTransactions, addTransaction, type Txn } from "@/lib/transactions-store";
import {
  budgetsStore, debtsStore, goalsStore, billsStore, type Bill,
} from "@/lib/finance-stores";
import { forecastByCategory } from "@/lib/finance-math";
import { toast } from "sonner";

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
const START_MONTH = 5;
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
  const [memberFilter, setMemberFilter] = useState<"all" | (typeof MEMBERS)[number]>("all");

  const { data: allUnfiltered } = useTransactions();
  const { data: budgets } = budgetsStore.useData();
  const { data: goals } = goalsStore.useData();
  const { data: debts } = debtsStore.useData();
  const { data: bills } = billsStore.useData();

  // Per-member filter (#7)
  const all = useMemo(
    () => memberFilter === "all" ? allUnfiltered : allUnfiltered.filter((t) => t.added_by === memberFilter),
    [allUnfiltered, memberFilter],
  );

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
  const prevStartStr = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const prevTxns = useMemo(
    () => all.filter((t) => t.occurred_on >= prevStartStr && t.occurred_on < startStr),
    [all, prevStartStr, startStr],
  );

  const totals = useMemo(() => {
    const byCat = new Map<string, number>();
    let income = 0, spent = 0, savingsContrib = 0;
    for (const t of txns) {
      // #1 Auto-reassign orphaned transactions to Miscellaneous
      const cat = categoryById(t.category);
      const catId = cat ? t.category : "miscellaneous";
      byCat.set(catId, (byCat.get(catId) ?? 0) + Number(t.amount));
      if (t.type === "income") income += Number(t.amount);
      else spent += Number(t.amount);
      if (cat?.group === "savings" && t.type === "expense") savingsContrib += Number(t.amount);
    }
    const totalBudget = CATEGORIES.filter((c) => c.group !== "income")
      .reduce((s, c) => s + budgetFor(c.id), 0);
    return { byCat, income, spent, savingsContrib, totalBudget };
  }, [txns, budgets]);

  const prevSpent = useMemo(
    () => prevTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    [prevTxns],
  );

  const today = new Date();
  const isCurrentMonth = today.getUTCFullYear() === y && today.getUTCMonth() === m;
  const dayOfMonth = isCurrentMonth ? today.getUTCDate() : daysInMonth;
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);

  const savingsBalance = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const savingsTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
  const saved = Math.max(0, totals.income - totals.spent);
  const availableCash = totals.income - totals.spent;
  const netWorth = availableCash + savingsBalance - totalDebt;

  const remainingBudget = totals.totalBudget - totals.spent;
  const safeToSpend = Math.max(0, remainingBudget) / daysLeft;
  const expectedSpendByNow = (totals.totalBudget / daysInMonth) * dayOfMonth;
  const onTrack = totals.spent <= expectedSpendByNow;

  // Forecast: variable categories project at daily pace; fixed/annual/CC/savings
  // are taken at face value (max of MTD vs budget) so they don't get inflated.
  const { forecastSpend, forecastSavings } = forecastByCategory({
    byCat: totals.byCat, budgetFor, income: totals.income,
    dayOfMonth, daysInMonth, isCurrentMonth,
  });

  // Financial Health (simple 3-factor): adherence + savings rate + emergency
  const monthlyExpenses = Math.max(totals.spent, prevSpent, 1);
  const adherence = totals.totalBudget > 0
    ? Math.max(0, Math.min(100, ((totals.totalBudget - Math.max(0, totals.spent - totals.totalBudget)) / totals.totalBudget) * 100))
    : 50;
  const savingsRate = totals.income > 0
    ? Math.max(0, Math.min(100, (saved / totals.income) * 100 / 0.2 * 100 / 100)) // 20% rate => 100
    : 0;
  const efMonths = savingsBalance / monthlyExpenses;
  const efScore = Math.max(0, Math.min(100, (efMonths / 6) * 100));
  const healthScore = Math.round((adherence + Math.min(100, savingsRate) + efScore) / 3);
  const healthBand = healthBandLabel(healthScore);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const rows = CATEGORIES.filter((c) => c.group !== "income")
      .map((c) => ({
        id: c.id, name: c.name, icon: c.icon,
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

  // Miscellaneous warning
  const miscAmount = totals.byCat.get("miscellaneous") ?? 0;
  const miscShare = (miscAmount / totalSpend) * 100;
  const miscWarn = miscShare > 10 && miscAmount > 0;

  // Top savings goal
  const topGoal = goals[0];
  const goalPct = topGoal && Number(topGoal.target_amount) > 0
    ? Math.min(100, (Number(topGoal.current_amount) / Number(topGoal.target_amount)) * 100)
    : 0;

  // Upcoming bills (next 30 days, unpaid)
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingBills = bills
    .filter((b) => !b.paid && b.due_date >= todayStr)
    .slice(0, 6);

  const recent = useMemo(() => all.slice(0, 6), [all]);
  const insights = buildInsights({
    totalSpend: totals.spent, prevSpent, byCat: totals.byCat,
    budgetFor, savingsContrib: totals.savingsContrib, onTrack, daysLeft, remainingBudget,
  });

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

      {/* Member filter (#7) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">View</span>
        {(["all", ...MEMBERS] as const).map((opt) => {
          const active = memberFilter === opt;
          return (
            <button
              key={opt}
              onClick={() => setMemberFilter(opt)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt === "all" ? "Family" : opt}
            </button>
          );
        })}
      </div>

      {/* Money Flow */}
      <MoneyFlowCard income={totals.income} expenses={totals.spent} saved={saved} />

      {/* Safe-To-Spend hero with explanation */}
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

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-3 backdrop-blur">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-80">Remaining budget</p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums">
                AED {formatAED(Math.max(0, remainingBudget))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-80">Days remaining</p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums">
                {daysLeft} day{daysLeft === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
            {onTrack ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="font-medium">
              {onTrack ? "On plan" : "Spending above plan"}
            </span>
          </div>
          <p className="mt-2 text-xs opacity-80">
            Expected by today: AED {formatAED(expectedSpendByNow)} · actual AED {formatAED(totals.spent)}
          </p>
        </div>
      </section>

      {/* Forecast */}
      <ForecastCard
        forecastSpend={forecastSpend}
        forecastSavings={forecastSavings}
        budget={totals.totalBudget}
      />

      {/* Financial Health */}
      <HealthCard score={healthScore} band={healthBand}
        breakdown={{ adherence, savings: Math.min(100, savingsRate), emergency: efScore }} />

      {/* Hierarchy summary: Large / Medium / 2 small */}
      <div className="space-y-3">
        <BigCard
          label="Available Cash"
          value={availableCash}
          subtitle="Income − Expenses this month"
          tone={availableCash >= 0 ? "primary" : "destructive"}
        />
        <MediumCard
          label="Net Worth"
          value={netWorth}
          subtitle="Cash + Savings − Debt"
          tone={netWorth >= 0 ? "investment" : "destructive"}
        />
        <div className="grid grid-cols-2 gap-3">
          <SmallSavingsCard goal={topGoal} balance={savingsBalance} target={savingsTarget} pct={goalPct} />
          <SmallCard
            label="Total Debt"
            value={totalDebt}
            icon={<CreditCard className="h-4 w-4" />}
            tone="destructive"
            sub={debts.length ? `${debts.length} active` : "Debt-free"}
          />
        </div>
      </div>

      {/* Miscellaneous warning */}
      {miscWarn && (
        <section className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Miscellaneous is {miscShare.toFixed(0)}% of spending
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                AED {formatAED(miscAmount)} sits in "Miscellaneous" — that's too much to be useful.
                Re-tag those transactions to a real category (Medical, Gifts, Home, School, Car…) so
                you actually know where it went.
              </p>
              <Link
                to="/transactions"
                search={{ category: "miscellaneous" }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warning"
              >
                Re-tag Miscellaneous transactions <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

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
              <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
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

      {/* Upcoming bills */}
      <UpcomingBillsCard bills={upcomingBills} />

      {/* Budget vs Actual */}
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

      {/* Emergency fund */}
      <EmergencyFundCard
        savingsBalance={savingsBalance}
        monthlyExpenses={monthlyExpenses}
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

function topBudgetRows(
  byCat: Map<string, number>,
  budgetFor: (id: string) => number,
) {
  return CATEGORIES
    .filter((c) => c.group !== "income")
    .map((c) => ({
      id: c.id, name: c.name,
      actual: byCat.get(c.id) ?? 0,
      budget: budgetFor(c.id),
    }))
    .filter((r) => r.budget > 0)
    .sort((a, b) => Math.abs(b.actual - b.budget) - Math.abs(a.actual - a.budget))
    .slice(0, 5);
}

function healthBandLabel(score: number) {
  if (score >= 85) return { label: "Excellent", tone: "text-success", bg: "bg-success/15" };
  if (score >= 70) return { label: "Healthy", tone: "text-savings", bg: "bg-savings/15" };
  if (score >= 50) return { label: "Fair", tone: "text-warning", bg: "bg-warning/15" };
  return { label: "Needs work", tone: "text-destructive", bg: "bg-destructive/15" };
}

function buildInsights(args: {
  totalSpend: number; prevSpent: number;
  byCat: Map<string, number>; budgetFor: (id: string) => number;
  savingsContrib: number; onTrack: boolean;
  daysLeft: number; remainingBudget: number;
}) {
  type Insight = { text: string; icon: typeof Sparkles; bg: string; fg: string };
  const out: Insight[] = [];
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
  let topCatId = "", topCatAmt = 0;
  for (const [id, amt] of args.byCat.entries()) {
    if (amt > topCatAmt) { topCatAmt = amt; topCatId = id; }
  }
  if (topCatId) {
    const cat = categoryById(topCatId);
    const budget = args.budgetFor(topCatId);
    if (budget > 0 && topCatAmt > budget * 0.8) {
      out.push({
        text: `${cat?.name} is at ${((topCatAmt / budget) * 100).toFixed(0)}% of its budget — your biggest spend so far.`,
        icon: AlertCircle, bg: "bg-warning/15", fg: "text-warning",
      });
    }
  }
  if (args.savingsContrib > 0) {
    out.push({
      text: `You've moved AED ${formatAED(args.savingsContrib)} to savings this month. Keep it up!`,
      icon: CheckCircle2, bg: "bg-savings/15", fg: "text-savings",
    });
  }
  if (!args.onTrack) {
    out.push({
      text: `You may exceed your budget in ${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"} at current pace.`,
      icon: AlertCircle, bg: "bg-destructive/15", fg: "text-destructive",
    });
  }
  return out.slice(0, 4);
}

// ---------- cards ----------

function MoneyFlowCard({ income, expenses, saved }: { income: number; expenses: number; saved: number }) {
  const total = Math.max(1, income);
  const expPct = Math.min(100, (expenses / total) * 100);
  const savPct = Math.max(0, 100 - expPct);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Money Flow</h2>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <FlowStat label="Income" value={income} tone="text-success" icon={<ArrowDownRight className="h-3 w-3" />} />
        <FlowStat label="Expenses" value={expenses} tone="text-destructive" icon={<ArrowUpRight className="h-3 w-3" />} />
        <FlowStat label={saved >= 0 ? "Saved" : "Shortfall"} value={Math.abs(saved)} tone={saved >= 0 ? "text-savings" : "text-destructive"} icon={<PiggyBank className="h-3 w-3" />} />
      </div>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full bg-destructive transition-all" style={{ width: `${expPct}%` }} />
        <div className="h-full bg-savings transition-all" style={{ width: `${savPct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{expPct.toFixed(0)}% spent</span>
        <span>{savPct.toFixed(0)}% saved</span>
      </div>
    </section>
  );
}

function FlowStat({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${tone} bg-secondary/60`}>
        {icon}
      </div>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-display text-sm font-semibold tabular-nums ${tone}`}>
        {formatAED(value)}
      </p>
    </div>
  );
}

function ForecastCard({ forecastSpend, forecastSavings, budget }: { forecastSpend: number; forecastSavings: number; budget: number }) {
  const overBudget = budget > 0 && forecastSpend > budget;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold">Spending Forecast</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected expenses</p>
          <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${overBudget ? "text-destructive" : "text-foreground"}`}>
            AED {formatAED(forecastSpend)}
          </p>
          {budget > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              vs budget AED {formatAED(budget)}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected savings</p>
          <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${forecastSavings >= 0 ? "text-savings" : "text-destructive"}`}>
            AED {formatAED(Math.abs(forecastSavings))}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {forecastSavings >= 0 ? "Projected surplus" : "Projected shortfall"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Based on current spending pace through end of month.
      </p>
    </section>
  );
}

function HealthCard({ score, band, breakdown }: {
  score: number; band: { label: string; tone: string; bg: string };
  breakdown: { adherence: number; savings: number; emergency: number };
}) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Financial Health</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${band.bg} ${band.tone}`}>
          {band.label}
        </span>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="none" className="text-secondary/60" />
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="none"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              className={band.tone} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold tabular-nums">{score}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <HealthRow label="Budget adherence" value={breakdown.adherence} />
          <HealthRow label="Savings rate" value={breakdown.savings} />
          <HealthRow label="Emergency fund" value={breakdown.emergency} />
        </div>
      </div>
    </section>
  );
}

function HealthRow({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{v}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function BigCard({ label, value, subtitle, tone }: {
  label: string; value: number; subtitle: string;
  tone: "primary" | "destructive";
}) {
  const grad = tone === "primary" ? "bg-gradient-primary" : "bg-destructive";
  return (
    <section className={`relative overflow-hidden rounded-2xl ${grad} p-5 text-primary-foreground shadow-card`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest opacity-80">{label}</p>
        <Wallet className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">
        <span className="text-sm font-normal opacity-80">AED </span>{formatAED(value)}
      </p>
      <p className="mt-1 text-xs opacity-80">{subtitle}</p>
    </section>
  );
}

function MediumCard({ label, value, subtitle, tone }: {
  label: string; value: number; subtitle: string;
  tone: "investment" | "destructive";
}) {
  const toneClass = tone === "investment" ? "text-investment bg-investment/15" : "text-destructive bg-destructive/15";
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
          <TrendingUp className="h-4 w-4" />
        </span>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
        <span className="text-xs font-normal text-muted-foreground">AED </span>{formatAED(value)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
    </section>
  );
}

function SmallCard({ label, value, icon, tone, sub }: {
  label: string; value: number; icon: React.ReactNode;
  tone: "savings" | "destructive"; sub?: string;
}) {
  const toneClass = tone === "savings" ? "text-savings bg-savings/15" : "text-destructive bg-destructive/15";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </span>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold tabular-nums">
        <span className="text-[10px] font-normal text-muted-foreground">AED </span>{formatAED(value)}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SmallSavingsCard({ goal, balance, target, pct }: {
  goal: { name: string } | undefined; balance: number; target: number; pct: number;
}) {
  if (!goal || target === 0) {
    return (
      <Link
        to="/goals"
        className="flex flex-col rounded-2xl border border-dashed border-border bg-card p-4 shadow-card transition hover:border-savings/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-savings/15 text-savings">
          <Target className="h-4 w-4" />
        </span>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Savings goal</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">No active goal</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-savings">
          Create one <ChevronRight className="h-3 w-3" />
        </p>
      </Link>
    );
  }
  return (
    <Link to="/goals" className="block rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-savings/15 text-savings">
          <PiggyBank className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-savings">{pct.toFixed(0)}%</span>
      </div>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {goal.name}
      </p>
      <p className="mt-0.5 font-display text-sm font-semibold tabular-nums">
        AED {formatAED(balance)} <span className="text-[10px] font-normal text-muted-foreground">/ {formatAED(target)}</span>
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full rounded-full bg-gradient-savings" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

function nextDueDate(from: string, recurring: string): string {
  const d = new Date(from);
  if (recurring === "weekly") d.setDate(d.getDate() + 7);
  else if (recurring === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().slice(0, 10);
}

function UpcomingBillsCard({ bills }: { bills: Bill[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("miscellaneous");
  const [recurring, setRecurring] = useState<string>("none");

  const expenseCats = CATEGORIES.filter((c) => c.group !== "income");

  async function add() {
    if (!name.trim() || !amount) return;
    try {
      await billsStore.add({
        name: name.trim(),
        amount: Number(amount),
        due_date: due,
        category,
        recurring,
      });
      setName(""); setAmount(""); setCategory("miscellaneous"); setRecurring("none");
      setOpen(false);
      toast.success("Bill added");
    } catch (e) {
      toast.error("Failed to add bill");
    }
  }
  async function markPaid(b: Bill) {
    try {
      await addTransaction({
        category: b.category || "miscellaneous",
        amount: Number(b.amount),
        type: "expense",
        occurred_on: new Date().toISOString().slice(0, 10),
        note: "Bill: " + b.name,
        added_by: "Mohammed",
        payment_method: "Cash",
      });
      if (b.recurring && b.recurring !== "none") {
        await billsStore.update(b.id, { due_date: nextDueDate(b.due_date, b.recurring), paid: false });
      } else {
        await billsStore.update(b.id, { paid: true });
      }
      toast.success("Marked paid");
    } catch { toast.error("Failed"); }
  }
  async function del(id: string) {
    try { await billsStore.remove(id); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Upcoming Bills</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} className="h-7 gap-1 px-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {open && (
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl bg-secondary/30 p-3 sm:grid-cols-2">
          <Input placeholder="Bill name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 sm:col-span-2" />
          <Input placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {expenseCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={recurring} onValueChange={setRecurring}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Recurring" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={add} className="h-9 sm:col-span-2">Save</Button>
        </div>
      )}

      {bills.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No upcoming bills. Add Internet, School fees, Insurance…
        </p>
      ) : (
        <ul className="space-y-2">
          {bills.map((b) => {
            const days = Math.max(0, Math.ceil((new Date(b.due_date).getTime() - Date.now()) / 86400000));
            const urgent = days <= 3;
            return (
              <li key={b.id} className="flex items-center gap-3 rounded-xl bg-secondary/30 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className={`text-[11px] ${urgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    Due in {days} day{days === 1 ? "" : "s"} · {new Date(b.due_date).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <p className="shrink-0 font-display text-sm font-semibold tabular-nums">
                  AED {formatAED(Number(b.amount))}
                </p>
                <button
                  onClick={() => markPaid(b)}
                  className="rounded-md p-1.5 text-success hover:bg-success/15"
                  title="Mark paid"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => del(b.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
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
