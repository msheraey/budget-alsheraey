import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import {
  CATEGORIES,
  GROUP_LABELS,
  MONTHS,
  formatAED,
  type CategoryGroup,
} from "@/lib/categories";
import { useTransactions } from "@/lib/transactions-store";


export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ledger" },
      { name: "description", content: "Your monthly budget overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  // Budget tracking starts June 2026
  const START_YEAR = 2026;
  const START_MONTH = 5; // June (0-indexed)
  const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.UTC(START_YEAR, START_MONTH + i, 1));
    return {
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    };
  });

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
  const startStr = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1))
    .toISOString().slice(0, 10);
  const endStr = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    .toISOString().slice(0, 10);
  const txns = useMemo(
    () => all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr),
    [all, startStr, endStr],
  );


  const totals = useMemo(() => {
    const byCat = new Map<string, number>();
    let income = 0;
    let spent = 0;
    for (const t of txns) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
      if (t.type === "income") income += t.amount;
      else spent += t.amount;
    }
    const budgetIncome = CATEGORIES.filter((c) => c.group === "income").reduce((s, c) => s + c.budget, 0);
    const budgetExpense = CATEGORIES.filter((c) => c.group !== "income").reduce((s, c) => s + c.budget, 0);
    return { byCat, income, spent, budgetIncome, budgetExpense };
  }, [txns]);

  const chartData = useMemo(() => {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const buckets: { day: string; Income: number; Spent: number; Net: number }[] = [];
    let cIn = 0;
    let cOut = 0;
    const byDay = new Map<number, { i: number; s: number }>();
    for (const t of txns) {
      const d = new Date(t.occurred_on + "T00:00:00Z").getUTCDate();
      const cur = byDay.get(d) ?? { i: 0, s: 0 };
      if (t.type === "income") cur.i += t.amount;
      else cur.s += t.amount;
      byDay.set(d, cur);
    }
    for (let d = 1; d <= days; d++) {
      const v = byDay.get(d) ?? { i: 0, s: 0 };
      cIn += v.i;
      cOut += v.s;
      buckets.push({
        day: String(d).padStart(2, "0"),
        Income: Math.round(cIn),
        Spent: Math.round(cOut),
        Net: Math.round(cIn - cOut),
      });
    }
    return buckets;
  }, [txns, cursor]);

  const monthLabel = `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
  const expenseProgress = totals.budgetExpense > 0 ? Math.min(100, (totals.spent / totals.budgetExpense) * 100) : 0;
  const netRemaining = totals.income - totals.spent;


  const groups: CategoryGroup[] = ["income", "fixed", "variable", "savings"];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-glow">
            Monthly overview
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {monthLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={`${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`}
            onValueChange={(v) => {
              const [y, m] = v.split("-").map(Number);
              setCursor(new Date(Date.UTC(y, m, 1)));
            }}
          >
            <SelectTrigger className="h-10 min-w-[10rem] rounded-xl border-border/60 bg-card/60 backdrop-blur">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddTransactionDialog defaultMonth={cursor} />
        </div>

      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Income" value={totals.income} sub={`Budget ${formatAED(totals.budgetIncome)}`} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <SummaryCard label="Spent" value={totals.spent} sub={`Budget ${formatAED(totals.budgetExpense)}`} icon={<TrendingDown className="h-5 w-5" />} tone="warning" />
        <SummaryCard label="Budget left" value={Math.max(0, totals.budgetExpense - totals.spent)} sub={`of ${formatAED(totals.budgetExpense)}`} icon={<Wallet className="h-5 w-5" />} tone="primary" />
        <SummaryCard label="Net remaining" value={netRemaining} sub="Income − Spent" icon={<PiggyBank className="h-5 w-5" />} tone={netRemaining >= 0 ? "success" : "destructive"} />
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card backdrop-blur">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Spend vs budget</p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              AED {formatAED(totals.spent)}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {formatAED(totals.budgetExpense)}
              </span>
            </p>
          </div>
          <p className="text-sm font-medium tabular-nums text-primary-glow">{expenseProgress.toFixed(0)}%</p>
        </div>
        <Progress value={expenseProgress} className="h-2" />
      </div>

      <div className="mt-8 space-y-6">
        {groups.map((g) => (
          <CategoryGroupSection key={g} group={g} byCat={totals.byCat} />
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Monthly progress</p>
            <h2 className="font-display text-xl font-semibold">Cumulative income vs spend</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Spent</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Net</span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.71 0.17 162)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.71 0.17 162)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.74 0.13 210)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.74 0.13 210)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.91 0.012 240)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "oklch(0.50 0.03 250)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "oklch(0.50 0.03 250)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatAED(Number(v))} />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid oklch(0.91 0.012 240)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "oklch(0.20 0.04 265)",
                  boxShadow: "0 6px 24px -12px oklch(0.20 0.04 265 / 0.18)",
                }}
                formatter={(v: number, n) => [`AED ${formatAED(v)}`, n as string]}
                labelFormatter={(l) => `Day ${l}`}
              />
              <Area type="monotone" dataKey="Income" stroke="oklch(0.71 0.17 162)" strokeWidth={2.5} fill="url(#gIncome)" />
              <Area type="monotone" dataKey="Spent" stroke="oklch(0.74 0.13 210)" strokeWidth={2.5} fill="url(#gSpent)" />
              <Area type="monotone" dataKey="Net" stroke="oklch(0.78 0.16 75)" strokeWidth={2} fill="url(#gNet)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <BudgetProgressSummary
        spent={totals.spent}
        budget={totals.budgetExpense}
        income={totals.income}
        net={netRemaining}
      />
    </div>
  );
}

function BudgetProgressSummary({
  spent, budget, income, net,
}: { spent: number; budget: number; income: number; net: number }) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;
  const over = remaining < 0;
  const clamped = Math.min(100, Math.max(0, pct));
  const status =
    pct >= 100 ? { label: "Over budget", tone: "text-destructive", bar: "bg-destructive" }
    : pct >= 85 ? { label: "Close to limit", tone: "text-warning", bar: "bg-gradient-warning" }
    : pct >= 50 ? { label: "On track", tone: "text-accent", bar: "bg-gradient-info" }
    : { label: "Healthy", tone: "text-success", bar: "bg-gradient-primary" };
  const daysIn = Math.max(1, new Date().getUTCDate());
  const dailyAvg = spent / daysIn;
  const daysLeft = Math.max(0, Math.ceil(remaining / Math.max(1, dailyAvg)));

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Budget progress</p>
          <h2 className="font-display text-xl font-semibold">
            You've used <span className={status.tone}>{pct.toFixed(0)}%</span> of your monthly budget
          </h2>
        </div>
        <span className={`rounded-full border border-border/60 px-3 py-1 text-xs font-medium ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${status.bar} transition-all`} style={{ width: `${clamped}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>AED {formatAED(spent)} spent</span>
        <span>AED {formatAED(budget)} budget</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={over ? "Over budget by" : "Remaining"} value={`AED ${formatAED(Math.abs(remaining))}`} tone={over ? "text-destructive" : "text-success"} />
        <Stat label="Spent so far" value={`AED ${formatAED(spent)}`} tone="text-accent" />
        <Stat label="Net (income − spend)" value={`AED ${formatAED(net)}`} tone={net >= 0 ? "text-success" : "text-destructive"} sub={`Income AED ${formatAED(income)}`} />
        <Stat label={over ? "Pace" : "At current pace, lasts"} value={over ? "Exceeded" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`} tone="text-primary-glow" sub={`Avg AED ${formatAED(dailyAvg)}/day`} />
      </div>
    </section>
  );
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2/40 p-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

function SummaryCard({
  label, value, sub, icon, tone,
}: {
  label: string; value: number; sub: string; icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    primary: "text-primary-glow",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  const gradientClass = {
    primary: "bg-gradient-primary",
    success: "bg-gradient-success",
    warning: "bg-gradient-warning",
    destructive: "bg-gradient-warning",
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-5 shadow-card backdrop-blur transition hover:border-primary/50 hover:-translate-y-0.5">
      <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${gradientClass} opacity-25 blur-2xl transition group-hover:opacity-50`} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow/60 to-transparent" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${gradientClass} text-primary-foreground shadow-glow`}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        <span className="text-sm font-normal text-muted-foreground">AED </span>
        <span className={toneClass}>{formatAED(value)}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}


function CategoryGroupSection({
  group, byCat,
}: { group: CategoryGroup; byCat: Map<string, number> }) {
  const cats = CATEGORIES.filter((c) => c.group === group);
  const budget = cats.reduce((s, c) => s + c.budget, 0);
  const actual = cats.reduce((s, c) => s + (byCat.get(c.id) ?? 0), 0);
  const isIncome = group === "income";

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 shadow-card backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">{GROUP_LABELS[group]}</h2>
        <p className="text-sm tabular-nums text-muted-foreground">
          <span className="text-foreground">{formatAED(actual)}</span> / {formatAED(budget)}
        </p>
      </div>
      <ul className="divide-y divide-border/60">
        {cats.map((c) => {
          const v = byCat.get(c.id) ?? 0;
          const diff = isIncome ? v - c.budget : c.budget - v;
          const pct = c.budget > 0 ? Math.min(100, (v / c.budget) * 100) : v > 0 ? 100 : 0;
          const overspent = !isIncome && v > c.budget;
          return (
            <li key={c.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        overspent ? "bg-destructive" : isIncome ? "bg-success" : "bg-gradient-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-baseline gap-3 text-right tabular-nums">
                  <span className="text-sm font-medium">{formatAED(v)}</span>
                  <span className="text-xs text-muted-foreground">/ {formatAED(c.budget)}</span>
                  <span
                    className={`w-16 text-xs font-medium ${
                      diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatAED(diff)}`}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
