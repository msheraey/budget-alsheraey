import { useMemo, useState, Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Repeat, CreditCard, Plus, Trash2, TrendingDown, TrendingUp,
  CalendarClock, Activity, Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CATEGORIES, categoryById, formatAED, MONTHS, GROUP_LABELS } from "@/lib/categories";
import { useTransactions } from "@/lib/transactions-store";
import {
  subscriptionsStore, debtsStore,
  budgetsStore, goalsStore,
  type Subscription, type Debt,
} from "@/lib/finance-stores";
import {
  budgetForFn, totalBudgetFor, monthRange, totalsForMonth,
  healthScore, forecast, topSavingsGoalBalance,
} from "@/lib/finance-math";
import {
  evaluateAchievements, BADGE_GROUPS, BADGE_TIER_STYLE,
} from "@/lib/achievements";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Ledger" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="space-y-5 px-4 pt-6 sm:px-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Insights</p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Reports</h1>
      </header>

      <Tabs defaultValue="review" className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1">
          <TabsTrigger value="review" className="text-[10px] px-1">Review</TabsTrigger>
          <TabsTrigger value="charts" className="text-[10px] px-1">Charts</TabsTrigger>
          <TabsTrigger value="forecast" className="text-[10px] px-1">Forecast</TabsTrigger>
          <TabsTrigger value="health" className="text-[10px] px-1">Health</TabsTrigger>
          <TabsTrigger value="subs" className="text-[10px] px-1">Subs</TabsTrigger>
          <TabsTrigger value="debts" className="text-[10px] px-1">Debts</TabsTrigger>
          <TabsTrigger value="badges" className="text-[10px] px-1">Badges</TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="mt-4"><MonthlyReview /></TabsContent>
        <TabsContent value="charts" className="mt-4"><ChartsTab /></TabsContent>
        <TabsContent value="forecast" className="mt-4"><ForecastTab /></TabsContent>
        <TabsContent value="health" className="mt-4"><HealthTab /></TabsContent>
        <TabsContent value="subs" className="mt-4"><SubscriptionsSection /></TabsContent>
        <TabsContent value="debts" className="mt-4"><DebtsSection /></TabsContent>
        <TabsContent value="badges" className="mt-4"><AchievementsSection /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Charts ---------------- */
// Brand palette stops (pink → purple → blue) reused across every chart so the
// same category/group always renders in the same colour.
const BRAND_STOPS = ["#FF5E5B", "#FF7A6B", "#F472B6", "#C46BFF", "#9F8CFF", "#7C5CFF", "#6E7BFF", "#5C7BFF", "#60A5FA"];
const INCOME_HUE = "#34D399"; // green for income lines/bars
const EXPENSE_HUE = "#FF5E5B"; // brand pink for expense lines/bars
const SAVED_HUE = "#9F8CFF";  // brand purple for net saved

const GROUP_COLOR: Record<string, string> = {
  income: INCOME_HUE,
  fixed: "#FF5E5B",
  credit_cards: "#F472B6",
  transport: "#C46BFF",
  food: "#9F8CFF",
  family: "#7C5CFF",
  health: "#6E7BFF",
  lifestyle: "#60A5FA",
  annual: "#FFB020",
  other: "#94A3B8",
  savings: "#34D399",
};

// Stable colour per category id (hash → BRAND_STOPS) so charts agree.
function colorForCat(id: string) {
  const c = categoryById(id);
  if (c && GROUP_COLOR[c.group]) return GROUP_COLOR[c.group];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BRAND_STOPS[h % BRAND_STOPS.length];
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
  padding: "8px 10px",
};

type Range = "thisMonth" | "lastMonth" | "last3" | "thisYear";
const RANGES: { id: Range; label: string }[] = [
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "last3", label: "Last 3 Months" },
  { id: "thisYear", label: "This Year" },
];

function rangeBounds(r: Range) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (r === "thisMonth") {
    return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
  }
  if (r === "lastMonth") {
    return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
  }
  if (r === "last3") {
    return { start: new Date(Date.UTC(y, m - 2, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
  }
  return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
}
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

function ChartCard({
  title, hint, hasData, emptyHint, children,
}: {
  title: string;
  hint: string;
  hasData: boolean;
  emptyHint: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (!hasData) {
    return (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-2xl border border-dashed border-border bg-card/60 p-4 text-left shadow-card transition hover:bg-card"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-semibold">{title}</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">No data</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{emptyHint}</p>
      </button>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Section {n}
      </span>
      <span className="h-px flex-1 bg-border" />
      <span className="font-display text-xs font-semibold">{title}</span>
    </div>
  );
}

function Swatches({ items }: { items: { name: string; color: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

function ChartsTab() {
  const { data: all } = useTransactions();
  const { data: budgets } = budgetsStore.useData();
  const { data: debts } = debtsStore.useData();
  const { data: goals } = goalsStore.useData();
  const [range, setRange] = useState<Range>("thisMonth");

  const { start, end } = rangeBounds(range);
  const sStr = toDateStr(start);
  const eStr = toDateStr(end);
  const inRange = useMemo(
    () => all.filter((t) => t.occurred_on >= sStr && t.occurred_on < eStr),
    [all, sStr, eStr],
  );

  // ----- shared aggregates -----
  const income = inRange.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = inRange.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // Income vs Expenses
  const ieData = [{ name: "Income", value: income }, { name: "Expenses", value: expense }];

  // Net cash flow per month over range
  const months = useMemo(() => {
    const arr: { y: number; m: number }[] = [];
    const s = new Date(start);
    while (s < end) {
      arr.push({ y: s.getUTCFullYear(), m: s.getUTCMonth() });
      s.setUTCMonth(s.getUTCMonth() + 1);
    }
    return arr;
  }, [sStr, eStr]);

  const cashFlow = useMemo(() => {
    return months.map(({ y, m }) => {
      const { startStr, endStr } = monthRange(y, m);
      const mt = all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr);
      const i = mt.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const e = mt.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { name: `${MONTHS[m].slice(0, 3)} ${String(y).slice(2)}`, net: i - e, income: i, expense: e };
    });
  }, [all, months]);

  // Daily expenses across the selected range, with a "safe to spend" line.
  const dailyExpenses = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of inRange) {
      if (t.type !== "expense") continue;
      map.set(t.occurred_on, (map.get(t.occurred_on) ?? 0) + Number(t.amount));
    }
    const out: { date: string; label: string; spent: number; safe: number }[] = [];
    const totalBudget = totalBudgetFor(budgets);
    // total days in range
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    const safePerDay = totalBudget > 0 ? totalBudget / totalDays : 0;
    const cur = new Date(start);
    while (cur < end) {
      const ds = toDateStr(cur);
      out.push({
        date: ds,
        label: `${cur.getUTCDate()}/${cur.getUTCMonth() + 1}`,
        spent: map.get(ds) ?? 0,
        safe: Math.round(safePerDay),
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }, [inRange, budgets, sStr, eStr]);

  // Spending by group (donut)
  const byGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of inRange) {
      if (t.type !== "expense") continue;
      const g = categoryById(t.category)?.group ?? "other";
      if (g === "income") continue;
      map.set(g, (map.get(g) ?? 0) + Number(t.amount));
    }
    return [...map.entries()]
      .map(([k, v]) => ({
        key: k,
        name: GROUP_LABELS[k as keyof typeof GROUP_LABELS] ?? k,
        value: v,
        color: GROUP_COLOR[k] ?? "#94A3B8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [inRange]);

  // Budget vs Actual by category
  const budgetVsActual = useMemo(() => {
    const fn = budgetForFn(budgets);
    const spentByCat = new Map<string, number>();
    for (const t of inRange) {
      if (t.type !== "expense") continue;
      const id = categoryById(t.category) ? t.category : "miscellaneous";
      spentByCat.set(id, (spentByCat.get(id) ?? 0) + Number(t.amount));
    }
    const monthsCount = months.length || 1;
    const rows: { id: string; name: string; actual: number; budget: number; color: string }[] = [];
    for (const c of CATEGORIES) {
      if (c.group === "income") continue;
      const actual = spentByCat.get(c.id) ?? 0;
      const budget = fn(c.id) * monthsCount;
      if (actual === 0 && budget === 0) continue;
      rows.push({ id: c.id, name: c.name, actual, budget, color: colorForCat(c.id) });
    }
    return rows.sort((a, b) => Math.max(b.actual, b.budget) - Math.max(a.actual, a.budget)).slice(0, 12);
  }, [inRange, budgets, months.length]);

  // Spending by category (donut, all)
  const byCatAll = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of inRange) {
      if (t.type !== "expense") continue;
      const id = categoryById(t.category) ? t.category : "miscellaneous";
      map.set(id, (map.get(id) ?? 0) + Number(t.amount));
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, name: categoryById(id)?.name ?? id, value: v, color: colorForCat(id) }))
      .sort((a, b) => b.value - a.value);
  }, [inRange]);

  const top10Cats = byCatAll.slice(0, 10);

  // Top 10 transactions
  const top10Txns = useMemo(() => {
    return [...inRange]
      .filter((t) => t.type === "expense")
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10)
      .map((t) => ({
        name: `${categoryById(t.category)?.name ?? "—"}${t.note ? ` · ${t.note.slice(0, 18)}` : ""}`,
        value: Number(t.amount),
        color: colorForCat(t.category),
      }));
  }, [inRange]);

  // Monthly spending trend — last 12 months regardless of range
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const rows: { name: string; spent: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1));
      const { startStr, endStr } = monthRange(d.getUTCFullYear(), d.getUTCMonth());
      const spent = all
        .filter((t) => t.type === "expense" && t.occurred_on >= startStr && t.occurred_on < endStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      rows.push({ name: `${MONTHS[d.getUTCMonth()].slice(0, 3)}`, spent });
    }
    return rows;
  }, [all]);

  // Creep categories trend (last 6 months)
  const creepIds = ["food-groceries", "food-delivery", "eat-out", "entertainment"] as const;
  const creepTrend = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const rows: Record<string, number | string>[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1));
      const { startStr, endStr } = monthRange(d.getUTCFullYear(), d.getUTCMonth());
      const mt = all.filter((t) => t.type === "expense" && t.occurred_on >= startStr && t.occurred_on < endStr);
      const row: Record<string, number | string> = { name: MONTHS[d.getUTCMonth()].slice(0, 3) };
      for (const id of creepIds) {
        row[id] = mt.filter((t) => t.category === id).reduce((s, t) => s + Number(t.amount), 0);
      }
      rows.push(row);
    }
    return rows;
  }, [all]);
  const creepHasData = creepTrend.some((r) => creepIds.some((id) => Number(r[id]) > 0));

  // Income trend (last 12 months)
  const incomeTrend = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const rows: { name: string; income: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1));
      const { startStr, endStr } = monthRange(d.getUTCFullYear(), d.getUTCMonth());
      const inc = all
        .filter((t) => t.type === "income" && t.occurred_on >= startStr && t.occurred_on < endStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      rows.push({ name: MONTHS[d.getUTCMonth()].slice(0, 3), income: inc });
    }
    return rows;
  }, [all]);

  // Savings rate per month (last 6 months)
  const savingsRate = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const rows: { name: string; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1));
      const { startStr, endStr } = monthRange(d.getUTCFullYear(), d.getUTCMonth());
      const mt = all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr);
      const inc = mt.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const exp = mt.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const rate = inc > 0 ? Math.max(-100, Math.min(100, ((inc - exp) / inc) * 100)) : 0;
      rows.push({ name: MONTHS[d.getUTCMonth()].slice(0, 3), rate: Math.round(rate) });
    }
    return rows;
  }, [all]);

  // Annual bills heatmap (this year)
  const annualHeatmap = useMemo(() => {
    const y = new Date().getUTCFullYear();
    const grid: { month: string; total: number }[] = [];
    for (let mi = 0; mi < 12; mi++) {
      const { startStr, endStr } = monthRange(y, mi);
      const total = all
        .filter((t) => t.type === "expense" && t.occurred_on >= startStr && t.occurred_on < endStr)
        .filter((t) => categoryById(t.category)?.group === "annual")
        .reduce((s, t) => s + Number(t.amount), 0);
      grid.push({ month: MONTHS[mi].slice(0, 3), total });
    }
    return grid;
  }, [all]);
  const annualMax = Math.max(1, ...annualHeatmap.map((r) => r.total));

  // Debt section
  const ccDebts = debts.filter((d) => d.debt_type === "credit_card" || d.name.toLowerCase().includes("card"));
  const cardsBalance = ccDebts
    .map((d) => ({ name: d.name, value: Number(d.balance), color: colorForCat(`cc-${d.name}`) }))
    .sort((a, b) => b.value - a.value);
  const totalDebtNow = debts.reduce((s, d) => s + Number(d.balance), 0);

  // Card payments (from transactions) per card category (in range)
  const ccPayments = useMemo(() => {
    const rows: { name: string; payments: number; color: string }[] = [];
    for (const c of CATEGORIES) {
      if (c.group !== "credit_cards") continue;
      const paid = inRange
        .filter((t) => t.type === "expense" && t.category === c.id)
        .reduce((s, t) => s + Number(t.amount), 0);
      if (paid > 0) rows.push({ name: c.name, payments: paid, color: colorForCat(c.id) });
    }
    return rows.sort((a, b) => b.payments - a.payments);
  }, [inRange]);

  // Goal progress
  const goalRows = goals.map((g) => ({
    name: g.name,
    current: Number(g.current_amount),
    target: Number(g.target_amount),
    pct: g.target_amount > 0 ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Range filter */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
              range === r.id
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* SECTION 1 — MONEY HEALTH */}
      <SectionHeader n={1} title="Money Health" />

      <ChartCard
        title="Income vs Expenses"
        hint="Are you living within your means — money in vs money out at a glance."
        hasData={income > 0 || expense > 0}
        emptyHint="No data yet — log income and expenses for this period."
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ieData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`AED ${formatAED(v)}`, ""]} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              <Cell fill={INCOME_HUE} />
              <Cell fill={EXPENSE_HUE} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Swatches items={[{ name: "Income", color: INCOME_HUE }, { name: "Expenses", color: EXPENSE_HUE }]} />
      </ChartCard>

      <ChartCard
        title="Daily Expenses"
        hint="What you spent each day vs your safe daily allowance. Bars above the line mean you went over for that day."
        hasData={dailyExpenses.some((d) => d.spent > 0)}
        emptyHint="No daily expenses logged in this period."
      >
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={dailyExpenses} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} interval="preserveStartEnd" />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`AED ${formatAED(Number(v))}`, n === "spent" ? "Spent" : "Safe/day"]} />
            <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
              {dailyExpenses.map((d, i) => (
                <Cell key={i} fill={d.safe > 0 && d.spent > d.safe ? EXPENSE_HUE : SAVED_HUE} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="safe" stroke={INCOME_HUE} strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <Swatches items={[
          { name: "Under safe limit", color: SAVED_HUE },
          { name: "Over safe limit", color: EXPENSE_HUE },
          { name: "Safe to spend / day", color: INCOME_HUE },
        ]} />
      </ChartCard>

      <ChartCard
        title="Net Cash Flow Over Time"
        hint="Whether you finish each month up or down, and which way it's trending."
        hasData={cashFlow.some((r) => r.income > 0 || r.expense > 0)}
        emptyHint="No data yet — log a full month of transactions."
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={cashFlow} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Line type="monotone" dataKey="net" stroke={SAVED_HUE} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <Swatches items={[{ name: "Net cash flow", color: SAVED_HUE }]} />
      </ChartCard>

      <ChartCard
        title="Spending by Group"
        hint="Which part of life is eating the most money."
        hasData={byGroup.length > 0}
        emptyHint="No expenses logged for this period."
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={byGroup} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={55} outerRadius={90} paddingAngle={2}>
              {byGroup.map((g) => <Cell key={g.key} fill={g.color} />)}
            </Pie>
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`AED ${formatAED(v)}`, ""]} />
          </PieChart>
        </ResponsiveContainer>
        <Swatches items={byGroup.map((g) => ({ name: g.name, color: g.color }))} />
      </ChartCard>

      <ChartCard
        title="Budget vs Actual by Category"
        hint="Where you're over or under your plan, category by category."
        hasData={budgetVsActual.length > 0}
        emptyHint="Set budgets and log expenses to compare them here."
      >
        <ResponsiveContainer width="100%" height={Math.max(220, budgetVsActual.length * 32)}>
          <BarChart data={budgetVsActual} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={92} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Bar dataKey="budget" fill="#94A3B8" radius={[0, 6, 6, 0]} />
            <Bar dataKey="actual" fill={EXPENSE_HUE} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <Swatches items={[{ name: "Budget", color: "#94A3B8" }, { name: "Actual", color: EXPENSE_HUE }]} />
      </ChartCard>

      {/* SECTION 2 — DEBT */}
      <SectionHeader n={2} title="Debt" />

      <ChartCard
        title="Total Debt Balance Over Time"
        hint="The number that must go down — your whole debt trending over time."
        hasData={false}
        emptyHint="Needs a monthly snapshot of each debt balance. Log a 'balance' value per debt at month-end (field to add: debt_balance_snapshots: { debt_id, month, balance })."
      >{null}</ChartCard>

      <ChartCard
        title="Balance per Credit Card"
        hint="Which card is heaviest and where to attack first."
        hasData={cardsBalance.length > 0 && cardsBalance.some((c) => c.value > 0)}
        emptyHint="Add your credit cards under Debts with their current balance."
      >
        <ResponsiveContainer width="100%" height={Math.max(180, cardsBalance.length * 36)}>
          <BarChart data={cardsBalance} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={92} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {cardsBalance.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
          Total debt now: AED {formatAED(totalDebtNow)}
        </p>
      </ChartCard>

      <ChartCard
        title="Card Payments vs Interest Charged"
        hint="Whether payments are reducing balances or just covering interest."
        hasData={false}
        emptyHint="Needs interest charges. Log each card's monthly interest as a transaction under that card category with note 'interest', or add a field interest_charged on the debt for the month."
      >{null}</ChartCard>

      {/* SECTION 3 — WHERE IT GOES */}
      <SectionHeader n={3} title="Where It Goes" />

      <ChartCard
        title="Spending by Category"
        hint="The full breakdown, category by category."
        hasData={byCatAll.length > 0}
        emptyHint="No expenses logged for this period."
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={byCatAll} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={50} outerRadius={92} paddingAngle={1}>
              {byCatAll.map((c) => <Cell key={c.id} fill={c.color} />)}
            </Pie>
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [`AED ${formatAED(v)}`, ""]} />
          </PieChart>
        </ResponsiveContainer>
        <Swatches items={byCatAll.slice(0, 10).map((c) => ({ name: c.name, color: c.color }))} />
      </ChartCard>

      <ChartCard
        title="Top 10 Categories"
        hint="Your biggest spending lines, largest first."
        hasData={top10Cats.length > 0}
        emptyHint="No expenses logged for this period."
      >
        <ResponsiveContainer width="100%" height={Math.max(220, top10Cats.length * 30)}>
          <BarChart data={top10Cats} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={92} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {top10Cats.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top 10 Transactions"
        hint="The single biggest purchases that hit this period."
        hasData={top10Txns.length > 0}
        emptyHint="No expense transactions in this period."
      >
        <ResponsiveContainer width="100%" height={Math.max(220, top10Txns.length * 30)}>
          <BarChart data={top10Txns} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={108} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {top10Txns.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* SECTION 4 — TRENDS */}
      <SectionHeader n={4} title="Trends" />

      <ChartCard
        title="Monthly Spending Trend"
        hint="Is your total spending creeping up or coming down."
        hasData={monthlyTrend.some((r) => r.spent > 0)}
        emptyHint="Needs at least a couple of months of expense history."
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Bar dataKey="spent" fill={EXPENSE_HUE} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <Swatches items={[{ name: "Total spent", color: EXPENSE_HUE }]} />
      </ChartCard>

      <ChartCard
        title="Selected Category Trends"
        hint="Watch the easy-to-creep categories month over month."
        hasData={creepHasData}
        emptyHint="Log Grocery, Delivery, Eat out or Entertainment to track creep."
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={creepTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            {creepIds.map((id) => (
              <Line key={id} type="monotone" dataKey={id} stroke={colorForCat(id)} strokeWidth={2} dot={{ r: 2.5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <Swatches items={creepIds.map((id) => ({ name: categoryById(id)?.name ?? id, color: colorForCat(id) }))} />
      </ChartCard>

      <ChartCard
        title="Income Trend"
        hint="Track your salary recovery as the job search pays off."
        hasData={incomeTrend.some((r) => r.income > 0)}
        emptyHint="Log income transactions to start tracking your recovery."
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={incomeTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} width={48} />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `AED ${formatAED(Number(v))}`} />
            <Line type="monotone" dataKey="income" stroke={INCOME_HUE} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <Swatches items={[{ name: "Income", color: INCOME_HUE }]} />
      </ChartCard>

      <ChartCard
        title="Savings Rate % by Month"
        hint="What share of income you actually kept."
        hasData={savingsRate.some((r) => r.rate !== 0)}
        emptyHint="Needs both income and expenses logged for a month."
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={savingsRate} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} width={40} unit="%" />
            <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Line type="monotone" dataKey="rate" stroke={SAVED_HUE} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <Swatches items={[{ name: "Savings rate", color: SAVED_HUE }]} />
      </ChartCard>

      {/* SECTION 5 — PLANNING */}
      <SectionHeader n={5} title="Planning" />

      <ChartCard
        title="Annual Bills Calendar"
        hint="Which months carry the big once-a-year hits so they don't ambush you."
        hasData={annualHeatmap.some((r) => r.total > 0)}
        emptyHint="Log annual bills (Visa renewal, Car renewal, License, Flight tickets, Eid) to see the calendar."
      >
        <div className="grid grid-cols-6 gap-1.5">
          {annualHeatmap.map((cell) => {
            const intensity = cell.total / annualMax;
            const bg = cell.total === 0
              ? "var(--secondary)"
              : `color-mix(in oklab, ${SAVED_HUE} ${Math.round(20 + intensity * 70)}%, transparent)`;
            return (
              <div key={cell.month}
                   className="flex aspect-square flex-col items-center justify-center rounded-lg border border-border/50 text-[10px]"
                   style={{ background: bg }}
                   title={`${cell.month}: AED ${formatAED(cell.total)}`}>
                <span className="font-semibold">{cell.month}</span>
                {cell.total > 0 && (
                  <span className="mt-0.5 tabular-nums text-[9px] opacity-80">{formatAED(cell.total)}</span>
                )}
              </div>
            );
          })}
        </div>
        <Swatches items={[{ name: "Annual bill hit", color: SAVED_HUE }]} />
      </ChartCard>

      <ChartCard
        title="Goal Progress"
        hint="How close you are to your savings targets."
        hasData={goalRows.length > 0}
        emptyHint="Add savings goals (e.g. Emergency buffer, Monthly savings) to track them here."
      >
        <ul className="space-y-3">
          {goalRows.map((g) => (
            <li key={g.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{g.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  AED {formatAED(g.current)} / {formatAED(g.target)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <div className="h-full rounded-full bg-gradient-primary"
                     style={{ width: `${g.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </ChartCard>

      {/* Data gaps note */}
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
        <p className="font-display text-xs font-semibold text-foreground">To unlock the locked charts, start logging:</p>
        <ul className="mt-1.5 list-disc pl-4">
          <li><span className="font-medium text-foreground">Total Debt Over Time</span> — a monthly snapshot of each debt balance (debt_id, month, balance).</li>
          <li><span className="font-medium text-foreground">Card Payments vs Interest</span> — the interest charged on each card per month (either as a transaction noted "interest" on that card category, or a monthly interest_charged field on the debt).</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Forecast ---------------- */

function ForecastTab() {
  const { data: all } = useTransactions();
  const { data: budgets } = budgetsStore.useData();
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const { startStr, endStr, daysInMonth } = monthRange(y, m);
  const dayOfMonth = now.getUTCDate();

  const txns = all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr);
  const totals = totalsForMonth(txns);
  const totalBudget = totalBudgetFor(budgets);
  const { forecastSpend, forecastSavings } = forecast({
    spent: totals.spent, income: totals.income, dayOfMonth, daysInMonth, isCurrentMonth: true,
  });

  const budgetFor = budgetForFn(budgets);
  // Per-category forecast
  const catForecast = useMemo(() => {
    return [...totals.byCat.entries()]
      .map(([id, amt]) => {
        const projected = (amt / Math.max(1, dayOfMonth)) * daysInMonth;
        const budget = budgetFor(id);
        return { id, name: categoryById(id)?.name ?? id, current: amt, projected, budget };
      })
      .filter((r) => r.current > 0)
      .sort((a, b) => b.projected - a.projected)
      .slice(0, 8);
  }, [totals.byCat, dayOfMonth, daysInMonth, budgets]);

  const overBudget = totalBudget > 0 && forecastSpend > totalBudget;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 opacity-90" />
          <p className="text-xs uppercase tracking-widest opacity-90">End-of-month forecast</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase opacity-80">Expected expenses</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">AED {formatAED(forecastSpend)}</p>
            {totalBudget > 0 && (
              <p className="mt-0.5 text-[11px] opacity-80 tabular-nums">vs budget AED {formatAED(totalBudget)}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase opacity-80">Expected savings</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">
              AED {formatAED(Math.abs(forecastSavings))}
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              {forecastSavings >= 0 ? "Projected surplus" : "Projected shortfall"}
            </p>
          </div>
        </div>
        {overBudget && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs">
            On pace to exceed budget by AED {formatAED(forecastSpend - totalBudget)}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-sm font-semibold">Per-category projection</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Based on the first {dayOfMonth} day{dayOfMonth === 1 ? "" : "s"} of {MONTHS[m]}.
        </p>
        <ul className="mt-3 space-y-3">
          {catForecast.length === 0 ? (
            <li className="text-sm text-muted-foreground">No spending yet this month.</li>
          ) : catForecast.map((r) => {
            const over = r.budget > 0 && r.projected > r.budget;
            const pct = r.budget > 0 ? Math.min(100, (r.projected / r.budget) * 100) : 0;
            return (
              <li key={r.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{r.name}</span>
                  <span className={`tabular-nums font-semibold ${over ? "text-destructive" : "text-foreground"}`}>
                    AED {formatAED(r.projected)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                  <div className={`h-full rounded-full ${over ? "bg-destructive" : "bg-gradient-primary"}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span>AED {formatAED(r.current)} so far</span>
                  <span>{r.budget > 0 ? `of AED ${formatAED(r.budget)}` : "no budget"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <AnnualForecastByCategory all={all} budgetFor={budgetFor} year={y} />
    </div>
  );
}

/* Annual forecast — each category × 12 vs YTD actual & projected annual.
   Groups categories by their parent group so it reads like the Budget page. */
function AnnualForecastByCategory({
  all, budgetFor, year,
}: { all: { occurred_on: string; type: string; amount: number; category: string }[]; budgetFor: (id: string) => number; year: number }) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;
  const now = new Date();
  const monthsElapsed = now.getUTCFullYear() === year
    ? now.getUTCMonth() + 1
    : now.getUTCFullYear() > year ? 12 : 0;

  const ytd = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of all) {
      if (t.occurred_on < yearStart || t.occurred_on >= yearEnd) continue;
      if (t.type !== "expense") continue;
      const id = categoryById(t.category) ? t.category : "miscellaneous";
      m.set(id, (m.get(id) ?? 0) + Number(t.amount));
    }
    return m;
  }, [all, yearStart, yearEnd]);

  const rows = useMemo(() => {
    return CATEGORIES.filter((c) => c.group !== "income").map((c) => {
      const monthly = budgetFor(c.id);
      const annualBudget = monthly * 12;
      const actual = ytd.get(c.id) ?? 0;
      const projected = monthsElapsed > 0 ? (actual / monthsElapsed) * 12 : 0;
      const variance = annualBudget - projected;
      return { id: c.id, name: c.name, group: c.group, monthly, annualBudget, actual, projected, variance };
    });
  }, [ytd, monthsElapsed]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return [...map.entries()];
  }, [rows]);

  const totals = rows.reduce(
    (a, r) => ({
      annualBudget: a.annualBudget + r.annualBudget,
      actual: a.actual + r.actual,
      projected: a.projected + r.projected,
      variance: a.variance + r.variance,
    }),
    { annualBudget: 0, actual: 0, projected: 0, variance: 0 },
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-semibold">Annual forecast by category — {year}</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{monthsElapsed}/12 mo</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Annual budget = monthly × 12. Projected = YTD actual ÷ months elapsed × 12. Variance: green = under, red = over.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-2">Category</th>
              <th className="py-2 pr-2 text-right">Annual budget</th>
              <th className="py-2 pr-2 text-right">YTD actual</th>
              <th className="py-2 pr-2 text-right">Projected</th>
              <th className="py-2 pr-2 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([group, items]) => (
              <Fragment key={group}>
                <tr className="border-t border-border bg-secondary/30">
                  <td colSpan={5} className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {GROUP_LABELS[group as keyof typeof GROUP_LABELS] ?? group}
                  </td>
                </tr>
                {items.map((r) => {
                  const over = r.variance < 0;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 pr-2 font-medium">{r.name}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatAED(r.annualBudget)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatAED(r.actual)}</td>
                      <td className={`py-2 pr-2 text-right tabular-nums ${over ? "text-destructive font-semibold" : ""}`}>{formatAED(r.projected)}</td>
                      <td className={`py-2 pr-2 text-right tabular-nums font-semibold ${over ? "text-destructive" : "text-success"}`}>
                        {over ? "−" : "+"}{formatAED(Math.abs(r.variance))}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            <tr className="border-t-2 border-border bg-secondary/40">
              <td className="py-2 pr-2 font-semibold">Total</td>
              <td className="py-2 pr-2 text-right tabular-nums font-semibold">{formatAED(totals.annualBudget)}</td>
              <td className="py-2 pr-2 text-right tabular-nums font-semibold">{formatAED(totals.actual)}</td>
              <td className={`py-2 pr-2 text-right tabular-nums font-semibold ${totals.variance < 0 ? "text-destructive" : ""}`}>
                {formatAED(totals.projected)}
              </td>
              <td className={`py-2 pr-2 text-right tabular-nums font-semibold ${totals.variance < 0 ? "text-destructive" : "text-success"}`}>
                {totals.variance < 0 ? "−" : "+"}{formatAED(Math.abs(totals.variance))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Health ---------------- */

function HealthTab() {
  const { data: all } = useTransactions();
  const { data: budgets } = budgetsStore.useData();
  const { data: goals } = goalsStore.useData();
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const { startStr, endStr } = monthRange(y, m);
  const prevStartStr = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const cur = all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr);
  const prev = all.filter((t) => t.occurred_on >= prevStartStr && t.occurred_on < startStr);
  const totals = totalsForMonth(cur);
  const prevSpent = prev.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const monthlyExpenses = Math.max(totals.spent, prevSpent, 1);
  const totalBudget = totalBudgetFor(budgets);
  const savingsBalance = topSavingsGoalBalance(goals);
  const h = healthScore({
    income: totals.income, spent: totals.spent, totalBudget, savingsBalance, monthlyExpenses,
  });
  const C = 2 * Math.PI * 56;
  const offset = C - (h.score / 100) * C;
  const band = h.score >= 85 ? { label: "Excellent", tone: "text-success" }
    : h.score >= 70 ? { label: "Healthy", tone: "text-savings" }
    : h.score >= 50 ? { label: "Fair", tone: "text-warning" }
    : { label: "Needs work", tone: "text-destructive" };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="none" className="text-secondary/60" />
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="none"
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} className={band.tone} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold tabular-nums">{h.score}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className={`mt-2 font-display text-lg font-semibold ${band.tone}`}>{band.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">Overall financial health for {MONTHS[m]} {y}</p>
        </div>
      </div>

      <div className="space-y-3">
        <HealthFactor label="Budget adherence" value={h.adherence}
          hint="100 when you're inside budget. Drops as you go over." />
        <HealthFactor label="Savings rate" value={h.savings}
          hint={`You're saving ${h.savingsRatePct.toFixed(0)}% of income. 20% earns full marks.`} />
        <HealthFactor label="Emergency fund" value={h.emergency}
          hint={`${h.efMonths.toFixed(1)} of 6 months of expenses covered.`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm font-semibold">How to improve</h3>
        </div>
        <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
          {h.adherence < 80 && <li>• Trim the categories currently over their budget.</li>}
          {h.savings < 60 && <li>• Aim for a 20% savings rate — set up a monthly transfer.</li>}
          {h.emergency < 60 && <li>• Top up the emergency fund toward 6 months of expenses.</li>}
          {h.adherence >= 80 && h.savings >= 60 && h.emergency >= 60 && (
            <li>• You're in good shape — keep it boring and consistent.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function HealthFactor({ label, value, hint }: { label: string; value: number; hint: string }) {
  const v = Math.round(value);
  const tone = v >= 80 ? "bg-gradient-savings" : v >= 50 ? "bg-gradient-primary" : "bg-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-display text-base font-semibold tabular-nums">{v}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}


/* ---------------- Monthly Review ---------------- */

function MonthlyReview() {
  const { data: all } = useTransactions();
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const startStr = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const endStr = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  const prevStartStr = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const cur = all.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr);
    const prev = all.filter((t) => t.occurred_on >= prevStartStr && t.occurred_on < startStr);
    const sum = (arr: typeof all, fn: (t: typeof all[0]) => boolean) =>
      arr.filter(fn).reduce((s, t) => s + t.amount, 0);
    const income = sum(cur, (t) => t.type === "income");
    const expenses = sum(cur, (t) => t.type === "expense");
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const byCat = new Map<string, number>();
    const prevByCat = new Map<string, number>();
    for (const t of cur) if (t.type === "expense") byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    for (const t of prev) if (t.type === "expense") prevByCat.set(t.category, (prevByCat.get(t.category) ?? 0) + t.amount);

    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    let bigIncrease: [string, number] | null = null;
    let bigDecrease: [string, number] | null = null;
    for (const [id, amt] of byCat.entries()) {
      const diff = amt - (prevByCat.get(id) ?? 0);
      if (!bigIncrease || diff > bigIncrease[1]) bigIncrease = [id, diff];
      if (!bigDecrease || diff < bigDecrease[1]) bigDecrease = [id, diff];
    }
    return { income, expenses, savingsRate, top, bigIncrease, bigDecrease };
  }, [all, startStr, endStr, prevStartStr]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{MONTHS[m]} {y}</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Income" value={stats.income} tone="text-success" />
          <Stat label="Expenses" value={stats.expenses} tone="text-destructive" />
          <Stat label="Savings rate" value={Math.round(stats.savingsRate)} suffix="%" tone="text-savings" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-sm font-semibold">Top spending categories</h3>
        <ul className="mt-3 space-y-2">
          {stats.top.length === 0 ? (
            <li className="text-sm text-muted-foreground">No expenses yet</li>
          ) : stats.top.map(([id, amt]) => (
            <li key={id} className="flex items-center justify-between text-sm">
              <span>{categoryById(id)?.name ?? id}</span>
              <span className="tabular-nums font-medium">AED {formatAED(amt)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.bigIncrease && stats.bigIncrease[1] > 0 && (
          <ChangeCard label="Biggest increase" id={stats.bigIncrease[0]} diff={stats.bigIncrease[1]} up />
        )}
        {stats.bigDecrease && stats.bigDecrease[1] < 0 && (
          <ChangeCard label="Biggest reduction" id={stats.bigDecrease[0]} diff={stats.bigDecrease[1]} up={false} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone, suffix }: { label: string; value: number; tone: string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-secondary/30 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold tabular-nums ${tone}`}>
        {suffix ? `${value}${suffix}` : `AED ${formatAED(value)}`}
      </p>
    </div>
  );
}

function ChangeCard({ label, id, diff, up }: { label: string; id: string; diff: number; up: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-sm font-medium">{categoryById(id)?.name ?? id}</span>
        <span className={`inline-flex items-center gap-1 font-display text-sm font-semibold tabular-nums ${up ? "text-destructive" : "text-success"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}{formatAED(diff)}
        </span>
      </div>
    </div>
  );
}

/* ---------------- Subscriptions ---------------- */

function SubscriptionsSection() {
  const { data: subs } = subscriptionsStore.useData();
  const monthlyTotal = subs.reduce((s, x) => s + (x.billing_cycle === "yearly" ? Number(x.amount) / 12 : Number(x.amount)), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-investment p-5 text-primary-foreground shadow-glow">
        <p className="text-xs uppercase tracking-widest opacity-90">Subscriptions / month</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">AED {formatAED(monthlyTotal)}</p>
        <p className="mt-1 text-xs opacity-80">≈ AED {formatAED(monthlyTotal * 12)} per year</p>
      </div>
      <div className="flex justify-end"><SubDialog /></div>

      {subs.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No subscriptions added.</p>
      ) : (
        <ul className="space-y-2">
          {subs.map((s) => <SubRow key={s.id} s={s} />)}
        </ul>
      )}
    </div>
  );
}

function SubRow({ s }: { s: Subscription }) {
  const annual = s.billing_cycle === "yearly" ? Number(s.amount) : Number(s.amount) * 12;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-investment/15 text-investment">
        <Repeat className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{s.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {s.next_renewal ? `Renews ${new Date(s.next_renewal).toLocaleDateString("en-AE", { day: "2-digit", month: "short" })}` : "No renewal date"}
          {" · "} {s.billing_cycle}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-sm font-semibold tabular-nums">AED {formatAED(Number(s.amount))}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">AED {formatAED(annual)}/yr</p>
      </div>
      <button onClick={() => subscriptionsStore.remove(s.id)} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function SubDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [renewal, setRenewal] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return toast.error("Name & amount required");
    await subscriptionsStore.add({
      name, amount: Number(amount), billing_cycle: cycle, next_renewal: renewal || null, icon: "Repeat",
    });
    toast.success("Added");
    setOpen(false); setName(""); setAmount(""); setRenewal("");
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 bg-gradient-primary text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Subscription</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add subscription</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Amount (AED)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Cycle</Label>
              <Select value={cycle} onValueChange={setCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Next renewal</Label><Input type="date" value={renewal} onChange={(e) => setRenewal(e.target.value)} /></div>
          <DialogFooter><Button type="submit" className="w-full bg-gradient-primary text-primary-foreground">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Debts ---------------- */

function DebtsSection() {
  const { data: debts } = debtsStore.useData();
  const total = debts.reduce((s, d) => s + Number(d.balance), 0);
  const monthly = debts.reduce((s, d) => s + Number(d.monthly_payment), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-expense p-5 text-primary-foreground shadow-glow">
        <p className="text-xs uppercase tracking-widest opacity-90">Total debt</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">AED {formatAED(total)}</p>
        <p className="mt-1 text-xs opacity-80">AED {formatAED(monthly)}/mo in payments</p>
      </div>
      <div className="flex justify-end"><DebtDialog /></div>

      {debts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No debts tracked. 🎉</p>
      ) : (
        <ul className="space-y-3">
          {debts.map((d) => <DebtCard key={d.id} d={d} />)}
        </ul>
      )}
    </div>
  );
}

function DebtCard({ d }: { d: Debt }) {
  const paid = Math.max(0, Number(d.original_amount) - Number(d.balance));
  const pct = Number(d.original_amount) > 0 ? (paid / Number(d.original_amount)) * 100 : 0;
  const monthsLeft = Number(d.monthly_payment) > 0 ? Math.ceil(Number(d.balance) / Number(d.monthly_payment)) : 0;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold">{d.name}</h3>
            <p className="text-[11px] text-muted-foreground capitalize">{d.debt_type.replace("_", " ")}</p>
          </div>
        </div>
        <button onClick={() => debtsStore.remove(d.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-baseline justify-between text-sm tabular-nums">
        <span className="font-display text-xl font-semibold text-destructive">AED {formatAED(Number(d.balance))}</span>
        <span className="text-xs text-muted-foreground">of {formatAED(Number(d.original_amount))}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{pct.toFixed(0)}% paid off</span>
        <span>AED {formatAED(Number(d.monthly_payment))}/mo · {monthsLeft} mo left</span>
      </div>
    </article>
  );
}

function DebtDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("credit_card");
  const [balance, setBalance] = useState("");
  const [original, setOriginal] = useState("");
  const [monthly, setMonthly] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !balance) return toast.error("Name & balance required");
    await debtsStore.add({
      name, debt_type: type, balance: Number(balance),
      original_amount: Number(original) || Number(balance),
      monthly_payment: Number(monthly) || 0,
    });
    toast.success("Added");
    setOpen(false); setName(""); setBalance(""); setOriginal(""); setMonthly("");
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 bg-gradient-primary text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Debt</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add debt</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Visa Card" /></div>
          <div className="space-y-2"><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Credit card</SelectItem>
                <SelectItem value="personal_loan">Personal loan</SelectItem>
                <SelectItem value="car_loan">Car loan</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2"><Label>Balance</Label><Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
            <div className="space-y-2"><Label>Original</Label><Input type="number" value={original} onChange={(e) => setOriginal(e.target.value)} /></div>
            <div className="space-y-2"><Label>Monthly</Label><Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div>
          </div>
          <DialogFooter><Button type="submit" className="w-full bg-gradient-primary text-primary-foreground">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Achievements ---------------- */

function AchievementsSection() {
  const { data: txns } = useTransactions();
  const { data: goals } = goalsStore.useData();
  const { data: debts } = debtsStore.useData();
  const { data: budgets } = budgetsStore.useData();

  const progress = useMemo(
    () => evaluateAchievements({ txns, goals, debts, budgets }),
    [txns, goals, debts, budgets],
  );

  const unlockedCount = progress.filter((p) => p.unlocked).length;
  const totalCount = progress.length;
  const overallPct = (unlockedCount / totalCount) * 100;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest opacity-90">Achievements</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {unlockedCount}<span className="text-base opacity-80">/{totalCount}</span>
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white" style={{ width: `${overallPct}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-90">
          {overallPct.toFixed(0)}% complete · keep going!
        </p>
      </div>

      {BADGE_GROUPS.map((group) => {
        const items = progress.filter((p) => p.badge.group === group);
        if (items.length === 0) return null;
        const got = items.filter((i) => i.unlocked).length;
        return (
          <section key={group}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="font-display text-sm font-semibold">{group}</h3>
              <span className="text-[11px] tabular-nums text-muted-foreground">{got} / {items.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((p) => <BadgeCard key={p.badge.key} p={p} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BadgeCard({ p }: { p: ReturnType<typeof evaluateAchievements>[number] }) {
  const Icon = p.badge.icon;
  const style = BADGE_TIER_STYLE[p.badge.tier];
  const pct = Math.round(p.progress * 100);
  const got = p.unlocked;

  const progressLabel = (() => {
    if (got) return "Unlocked";
    if (p.unit === "AED") return `AED ${formatAED(p.current)} / ${formatAED(p.target)}`;
    if (p.unit === "%") return `${Math.round(p.current)}% / ${p.target}%`;
    if (p.target === 1) return `${pct}%`;
    return `${Math.round(p.current)} / ${p.target}${p.unit ? ` ${p.unit}` : ""}`;
  })();

  return (
    <div
      className={`relative rounded-2xl border p-3 text-center shadow-card transition ${
        got
          ? "border-primary/40 bg-card"
          : "border-border bg-card/60"
      }`}
    >
      <span
        className={`relative mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-2 ${style.ring} ${
          got ? style.bg : "bg-secondary"
        } ${got ? style.text : "text-muted-foreground"}`}
        style={got ? { boxShadow: "0 8px 24px -10px rgb(0 0 0 / 0.45)" } : undefined}
      >
        {got ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </span>
      <p className={`mt-2 font-display text-[13px] font-semibold leading-tight ${got ? "" : "text-foreground/80"}`}>
        {p.badge.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{p.badge.desc}</p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary/60">
        <div className={`h-full rounded-full ${got ? "bg-gradient-primary" : "bg-primary/60"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">{progressLabel}</p>
      <span className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
        {p.badge.tier}
      </span>
    </div>
  );
}
