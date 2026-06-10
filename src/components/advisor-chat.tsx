import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, X, Sparkles, Send, AlertTriangle, TrendingUp,
  TrendingDown, PiggyBank, CreditCard, Target, CheckCircle2, Lightbulb,
} from "lucide-react";
import { CATEGORIES, categoryById, formatAED } from "@/lib/categories";
import { useTransactions } from "@/lib/transactions-store";
import {
  budgetsStore, debtsStore, goalsStore, billsStore,
} from "@/lib/finance-stores";
import {
  budgetForFn, monthRange, totalsForMonth, totalBudgetFor,
  forecastByCategory, VARIABLE_GROUPS,
} from "@/lib/finance-math";

type Msg = {
  id: string;
  from: "bot" | "user";
  text: string;
  icon?: typeof Lightbulb;
  tone?: "good" | "warn" | "bad" | "info";
};

const toneClass = (t?: Msg["tone"]) => {
  switch (t) {
    case "good": return "bg-success/15 text-success";
    case "warn": return "bg-warning/15 text-warning";
    case "bad":  return "bg-destructive/15 text-destructive";
    default:     return "bg-accent/15 text-accent";
  }
};

export function AdvisorChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: txns } = useTransactions();
  const { data: budgets } = budgetsStore.useData();
  const { data: debts } = debtsStore.useData();
  const { data: goals } = goalsStore.useData();
  const { data: bills } = billsStore.useData();

  const insights = useMemo(
    () => buildAllInsights({ txns, budgets, debts, goals, bills }),
    [txns, budgets, debts, goals, bills],
  );

  // Seed greeting once open with first time.
  useEffect(() => {
    if (open && history.length === 0) {
      const top = insights.slice(0, 4);
      setHistory([
        { id: "g", from: "bot", icon: Sparkles, tone: "info",
          text: "Hi! I'm your money advisor. Here's what I'm seeing in your recent activity:" },
        ...top.map((i, idx) => ({ id: `seed-${idx}`, from: "bot" as const, ...i })),
        { id: "tip", from: "bot", icon: Lightbulb, tone: "info",
          text: "Ask me anything: try \"how am I doing\", \"top categories\", \"upcoming bills\", \"can I save more\", or \"debt\"." },
      ]);
    }
  }, [open, insights, history.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, open]);

  function send() {
    const q = input.trim();
    if (!q) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, from: "user", text: q };
    const reply = answer(q, insights);
    setHistory((h) => [...h, userMsg, ...reply.map((r, i) => ({ id: `r-${Date.now()}-${i}`, from: "bot" as const, ...r }))]);
    setInput("");
  }

  return (
    <>
      {/* Floating launcher — bottom-left, above the bottom nav */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close advisor" : "Open advisor"}
        className="fixed bottom-24 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-fab transition hover:translate-y-[-2px] lg:bottom-6 lg:left-6"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && insights.some((i) => i.tone === "bad" || i.tone === "warn") && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Money advisor"
          className="fixed bottom-40 left-4 z-40 flex h-[min(70vh,560px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card backdrop-blur lg:bottom-24 lg:left-6"
        >
          <header className="flex items-center gap-2 border-b border-border bg-gradient-primary px-4 py-3 text-primary-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">Money advisor</p>
              <p className="text-[10px] opacity-90">Live insights from your data</p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {history.map((m) => {
              if (m.from === "user") {
                return (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-primary px-3 py-2 text-xs text-primary-foreground">
                      {m.text}
                    </p>
                  </div>
                );
              }
              const Icon = m.icon ?? Sparkles;
              return (
                <div key={m.id} className="flex items-start gap-2">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClass(m.tone)}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-foreground">
                    {m.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {["How am I doing?", "Top categories", "Upcoming bills", "Can I save more?", "Debt"].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => {
                      setHistory((h) => [...h,
                        { id: `u-${Date.now()}`, from: "user", text: q },
                        ...answer(q, insights).map((r, i) => ({ id: `r-${Date.now()}-${i}`, from: "bot" as const, ...r })),
                      ]);
                      setInput("");
                    }, 0);
                  }}
                  className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground transition hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-1.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your money…"
                className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Rule-based insights engine ---------------- */

type RawInsight = { text: string; icon: typeof Lightbulb; tone: Msg["tone"]; tag: string };

function buildAllInsights(args: {
  txns: { id: string; category: string; amount: number; type: string; occurred_on: string; added_by: string | null }[];
  budgets: { category: string; amount: number }[];
  debts: { name: string; balance: number; monthly_payment: number }[];
  goals: { name: string; current_amount: number; target_amount: number }[];
  bills: { name: string; amount: number; due_date: string; paid: boolean }[];
}): RawInsight[] {
  const out: RawInsight[] = [];
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const { startStr, endStr, daysInMonth } = monthRange(y, m);
  const prevStart = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const dayOfMonth = now.getUTCDate();
  const budgetFor = budgetForFn(args.budgets as never);

  const thisMonth = args.txns.filter((t) => t.occurred_on >= startStr && t.occurred_on < endStr);
  const prevMonth = args.txns.filter((t) => t.occurred_on >= prevStart && t.occurred_on < startStr);
  const t = totalsForMonth(thisMonth as never);
  const pt = totalsForMonth(prevMonth as never);
  const totalBudget = totalBudgetFor(args.budgets as never);
  const f = forecastByCategory({
    byCat: t.byCat, budgetFor, income: t.income,
    dayOfMonth, daysInMonth, isCurrentMonth: true,
  });

  // Overall pace
  if (totalBudget > 0) {
    const expected = (totalBudget / daysInMonth) * dayOfMonth;
    if (t.spent > expected * 1.1) {
      out.push({
        tag: "pace",
        text: `You're AED ${formatAED(t.spent - expected)} over the pace for day ${dayOfMonth}. Slow variable spending to stay on plan.`,
        icon: AlertTriangle, tone: "warn",
      });
    } else if (t.spent < expected * 0.9) {
      out.push({
        tag: "pace",
        text: `Nicely paced — you're AED ${formatAED(expected - t.spent)} under the expected spend so far this month.`,
        icon: CheckCircle2, tone: "good",
      });
    }
  }

  // Forecast vs budget
  if (totalBudget > 0 && f.forecastSpend > totalBudget) {
    out.push({
      tag: "forecast",
      text: `At this pace your variable spending will project AED ${formatAED(f.forecastSpend - totalBudget)} over budget by month-end.`,
      icon: TrendingUp, tone: "bad",
    });
  } else if (f.forecastSavings > 0) {
    out.push({
      tag: "forecast",
      text: `Projected surplus this month: AED ${formatAED(f.forecastSavings)}. Move some to savings before it disappears.`,
      icon: PiggyBank, tone: "good",
    });
  }

  // MoM change
  if (pt.spent > 0) {
    const change = ((t.spent - pt.spent) / pt.spent) * 100;
    if (Math.abs(change) >= 10) {
      out.push({
        tag: "mom",
        text: `Spending is ${Math.abs(change).toFixed(0)}% ${change > 0 ? "higher" : "lower"} than last month so far.`,
        icon: change > 0 ? TrendingUp : TrendingDown,
        tone: change > 0 ? "warn" : "good",
      });
    }
  }

  // Top variable categories over budget
  for (const c of CATEGORIES) {
    if (c.group === "income") continue;
    if (!VARIABLE_GROUPS.has(c.group)) continue;
    const spent = t.byCat.get(c.id) ?? 0;
    const b = budgetFor(c.id);
    if (b > 0 && spent > b) {
      out.push({
        tag: "cat-over",
        text: `${c.name} is AED ${formatAED(spent - b)} over budget (${formatAED(spent)} of ${formatAED(b)}).`,
        icon: AlertTriangle, tone: "bad",
      });
    } else if (b > 0 && spent > b * 0.85 && dayOfMonth < daysInMonth - 5) {
      out.push({
        tag: "cat-near",
        text: `${c.name} at ${((spent / b) * 100).toFixed(0)}% of budget with ${daysInMonth - dayOfMonth} day(s) left.`,
        icon: AlertTriangle, tone: "warn",
      });
    }
  }

  // Miscellaneous warning
  const misc = t.byCat.get("miscellaneous") ?? 0;
  if (misc > 0 && t.spent > 0 && (misc / t.spent) * 100 > 10) {
    out.push({
      tag: "misc",
      text: `${((misc / t.spent) * 100).toFixed(0)}% of your spending is "Miscellaneous". Retag those so trends are useful.`,
      icon: Lightbulb, tone: "warn",
    });
  }

  // Savings goals
  for (const g of args.goals) {
    if (Number(g.target_amount) <= 0) continue;
    const pct = (Number(g.current_amount) / Number(g.target_amount)) * 100;
    if (pct >= 100) {
      out.push({ tag: "goal", text: `🎉 "${g.name}" goal reached! Set the next one.`, icon: Target, tone: "good" });
    } else if (pct >= 75) {
      out.push({ tag: "goal", text: `Almost there — "${g.name}" is ${pct.toFixed(0)}% funded.`, icon: Target, tone: "good" });
    }
  }

  // Debts
  const totalDebt = args.debts.reduce((s, d) => s + Number(d.balance), 0);
  if (totalDebt > 0) {
    const highest = [...args.debts].sort((a, b) => Number(b.balance) - Number(a.balance))[0];
    if (highest) {
      out.push({
        tag: "debt",
        text: `Highest balance: ${highest.name} at AED ${formatAED(Number(highest.balance))}. Snowball this one first for momentum.`,
        icon: CreditCard, tone: "warn",
      });
    }
  }

  // Bills due in next 7 days
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const in7str = in7.toISOString().slice(0, 10);
  const dueSoon = args.bills.filter((b) => !b.paid && b.due_date >= today && b.due_date <= in7str);
  if (dueSoon.length > 0) {
    const total = dueSoon.reduce((s, b) => s + Number(b.amount), 0);
    out.push({
      tag: "bills",
      text: `${dueSoon.length} bill${dueSoon.length === 1 ? "" : "s"} due in the next 7 days — AED ${formatAED(total)} total.`,
      icon: AlertTriangle, tone: "warn",
    });
  }

  // Savings rate tip
  if (t.income > 0) {
    const rate = ((t.income - t.spent) / t.income) * 100;
    if (rate < 10) {
      out.push({
        tag: "rate",
        text: `Saving rate this month is ${rate.toFixed(0)}%. Aim for 20%+ — start by trimming the top variable category.`,
        icon: Lightbulb, tone: "warn",
      });
    } else if (rate >= 20) {
      out.push({
        tag: "rate",
        text: `Saving rate is ${rate.toFixed(0)}% — that's healthy. Consider moving the surplus to a goal.`,
        icon: CheckCircle2, tone: "good",
      });
    }
  }

  if (out.length === 0) {
    out.push({
      tag: "ok",
      text: "Nothing flagged — log a few more transactions and I'll surface trends.",
      icon: CheckCircle2, tone: "good",
    });
  }
  return out;
}

function answer(q: string, insights: RawInsight[]): Omit<Msg, "id" | "from">[] {
  const s = q.toLowerCase();
  const pick = (tags: string[]) => insights.filter((i) => tags.includes(i.tag));
  if (/doing|status|overall|how|going/.test(s)) {
    const rows = pick(["pace", "forecast", "rate", "mom"]);
    return rows.length ? rows.map(toMsg) : [{ text: "Not enough data yet to summarize this month.", icon: Sparkles, tone: "info" }];
  }
  if (/top|category|categories|where|spend/.test(s)) {
    const rows = pick(["cat-over", "cat-near", "misc"]);
    return rows.length ? rows.map(toMsg) : [{ text: "No category is breaking its budget right now.", icon: CheckCircle2, tone: "good" }];
  }
  if (/bill|due|upcoming/.test(s)) {
    const rows = pick(["bills"]);
    return rows.length ? rows.map(toMsg) : [{ text: "No bills due in the next 7 days.", icon: CheckCircle2, tone: "good" }];
  }
  if (/save|saving|goal/.test(s)) {
    const rows = pick(["rate", "goal", "forecast"]);
    return rows.length ? rows.map(toMsg) : [{ text: "Add a savings goal in the Goals tab and I'll track it here.", icon: Target, tone: "info" }];
  }
  if (/debt|card|loan/.test(s)) {
    const rows = pick(["debt"]);
    return rows.length ? rows.map(toMsg) : [{ text: "No active debts logged — nice place to be!", icon: CheckCircle2, tone: "good" }];
  }
  if (/help|what can you/.test(s)) {
    return [{ text: "I summarise spending, flag overspends, project month-end, watch bills and goals, and suggest where to trim — all from your live data.", icon: Lightbulb, tone: "info" }];
  }
  // default: top 3 insights
  return insights.slice(0, 3).map(toMsg);
}

function toMsg(i: RawInsight): Omit<Msg, "id" | "from"> {
  return { text: i.text, icon: i.icon, tone: i.tone };
}
