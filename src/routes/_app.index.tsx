import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Wallet, PiggyBank } from "lucide-react";
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

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card backdrop-blur transition hover:border-primary/40">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-primary opacity-10 blur-2xl transition group-hover:opacity-25" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className={toneClass}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        <span className="text-sm font-normal text-muted-foreground">AED </span>
        {formatAED(value)}
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
