import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Repeat, CreditCard, Trophy, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
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
import { categoryById, formatAED, MONTHS } from "@/lib/categories";
import { useTransactions } from "@/lib/transactions-store";
import {
  subscriptionsStore, debtsStore, achievementsStore,
  type Subscription, type Debt,
} from "@/lib/finance-stores";

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="subs">Subs</TabsTrigger>
          <TabsTrigger value="debts">Debts</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="mt-4"><MonthlyReview /></TabsContent>
        <TabsContent value="subs" className="mt-4"><SubscriptionsSection /></TabsContent>
        <TabsContent value="debts" className="mt-4"><DebtsSection /></TabsContent>
        <TabsContent value="badges" className="mt-4"><AchievementsSection /></TabsContent>
      </Tabs>
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

const BADGES = [
  { key: "first_transaction",   title: "First Steps",          desc: "Logged your first transaction" },
  { key: "month_under_budget",  title: "Disciplined",          desc: "1 month under budget" },
  { key: "three_months_budget", title: "Streak Master",        desc: "3 months under budget" },
  { key: "emergency_started",   title: "Safety Net",           desc: "Emergency fund started" },
  { key: "saved_10k",           title: "Saver",                desc: "Saved AED 10,000" },
  { key: "goal_completed",      title: "Goal Crusher",         desc: "Completed a savings goal" },
  { key: "no_overspend",        title: "On Target",            desc: "No overspending this month" },
];

function AchievementsSection() {
  const { data: unlocked } = achievementsStore.useData();
  const set = new Set(unlocked.map((a) => a.key));
  return (
    <div className="grid grid-cols-2 gap-3">
      {BADGES.map((b) => {
        const got = set.has(b.key);
        return (
          <div
            key={b.key}
            className={`rounded-2xl border p-4 text-center shadow-card transition ${
              got ? "border-savings/40 bg-card" : "border-border bg-card/40 opacity-60"
            }`}
          >
            <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${got ? "bg-gradient-savings text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <Trophy className="h-5 w-5" />
            </span>
            <p className="mt-2 font-display text-sm font-semibold">{b.title}</p>
            <p className="text-[11px] text-muted-foreground">{b.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
