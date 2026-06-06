import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES, GROUP_LABELS, GROUP_ORDER, categoryById, formatAED, type CategoryGroup,
} from "@/lib/categories";
import { budgetsStore } from "@/lib/finance-stores";
import { useTransactions } from "@/lib/transactions-store";

export const Route = createFileRoute("/_app/budget")({
  head: () => ({ meta: [{ title: "Budget — Ledger" }] }),
  component: BudgetPage,
});

function BudgetPage() {
  const { data: budgets } = budgetsStore.useData();
  const { data: txns } = useTransactions();
  const [showEmpty, setShowEmpty] = useState(false);

  const now = new Date();
  const startStr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const endStr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  // Auto-reassign orphans to "miscellaneous" so they remain countable.
  const actuals = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (t.occurred_on >= startStr && t.occurred_on < endStr) {
        const id = categoryById(t.category) ? t.category : "miscellaneous";
        m.set(id, (m.get(id) ?? 0) + Number(t.amount));
      }
    }
    return m;
  }, [txns, startStr, endStr]);

  const budgetFor = (id: string) =>
    budgets.find((b) => b.category === id)?.amount ?? categoryById(id)?.budget ?? 0;

  const groups: CategoryGroup[] = [...GROUP_ORDER.filter((g) => g !== "income"), "income"];

  const totalBudget = CATEGORIES.filter((c) => c.group !== "income").reduce((s, c) => s + budgetFor(c.id), 0);
  const totalActual = CATEGORIES.filter((c) => c.group !== "income").reduce((s, c) => s + (actuals.get(c.id) ?? 0), 0);
  const totalPct = totalBudget > 0 ? Math.min(100, (totalActual / totalBudget) * 100) : 0;

  return (
    <div className="space-y-5 px-4 pt-6 sm:px-6">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Plan</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Monthly budget</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total this month</p>
              <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums">
                AED {formatAED(totalActual)} <span className="text-base text-muted-foreground">/ {formatAED(totalBudget)}</span>
              </p>
            </div>
            <span className={`tabular-nums text-sm font-semibold ${totalActual > totalBudget ? "text-destructive" : "text-success"}`}>
              {totalActual > totalBudget ? "+" : "−"}{formatAED(Math.abs(totalBudget - totalActual))}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
            <div className={`h-full rounded-full ${totalActual > totalBudget ? "bg-destructive" : "bg-gradient-primary"}`} style={{ width: `${totalPct}%` }} />
          </div>
        </div>
        <button
          onClick={() => setShowEmpty((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {showEmpty ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showEmpty ? "Hide empty categories" : "Show all categories"}
        </button>
      </header>

      {groups.map((g) => (
        <BudgetGroup
          key={g} group={g}
          actuals={actuals}
          budgetFor={budgetFor}
          showEmpty={showEmpty}
        />
      ))}
    </div>
  );
}

function BudgetGroup({
  group, actuals, budgetFor, showEmpty,
}: {
  group: CategoryGroup;
  actuals: Map<string, number>;
  budgetFor: (id: string) => number;
  showEmpty: boolean;
}) {
  const allCats = CATEGORIES.filter((c) => c.group === group);
  const cats = showEmpty
    ? allCats
    : allCats.filter((c) => budgetFor(c.id) > 0 || (actuals.get(c.id) ?? 0) > 0);

  const groupBudget = allCats.reduce((s, c) => s + budgetFor(c.id), 0);
  const groupActual = allCats.reduce((s, c) => s + (actuals.get(c.id) ?? 0), 0);
  const isIncome = group === "income";
  const groupPct = groupBudget > 0 ? Math.min(100, (groupActual / groupBudget) * 100) : 0;
  const over = !isIncome && groupActual > groupBudget && groupBudget > 0;
  const hiddenCount = allCats.length - cats.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-semibold">{GROUP_LABELS[group]}</h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            <span className={`font-semibold ${over ? "text-destructive" : "text-foreground"}`}>
              AED {formatAED(groupActual)}
            </span>
            {groupBudget > 0 && <span> / {formatAED(groupBudget)}</span>}
          </p>
        </div>
        {groupBudget > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
            <div
              className={`h-full rounded-full ${over ? "bg-destructive" : isIncome ? "bg-success" : "bg-gradient-primary"}`}
              style={{ width: `${groupPct}%` }}
            />
          </div>
        )}
      </div>
      {cats.length === 0 ? (
        <p className="px-5 py-4 text-xs text-muted-foreground">
          No active categories. {hiddenCount > 0 && `${hiddenCount} hidden — tap “Show all categories”.`}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {cats.map((c) => (
            <BudgetRow
              key={c.id}
              id={c.id}
              name={c.name}
              actual={actuals.get(c.id) ?? 0}
              budget={budgetFor(c.id)}
              isIncome={isIncome}
            />
          ))}
        </ul>
      )}
      {!showEmpty && hiddenCount > 0 && cats.length > 0 && (
        <p className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
          {hiddenCount} empty categor{hiddenCount === 1 ? "y" : "ies"} hidden
        </p>
      )}
    </section>
  );
}

function BudgetRow({
  id, name, actual, budget, isIncome,
}: { id: string; name: string; actual: number; budget: number; isIncome: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(budget));
  const diff = isIncome ? actual - budget : budget - actual;
  const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
  const over = !isIncome && diff < 0;

  async function save() {
    try {
      await budgetsStore.upsert({ category: id, amount: Number(val) || 0 }, "category");
      toast.success("Budget saved");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <li className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{name}</p>
            {editing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number" inputMode="decimal" min="0"
                  value={val} onChange={(e) => setVal(e.target.value)}
                  className="h-8 w-24 text-right tabular-nums"
                />
                <Button size="sm" className="h-8" onClick={save}>Save</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditing(false); setVal(String(budget)); }}>Cancel</Button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs font-medium text-primary hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
            <div
              className={`h-full rounded-full ${over ? "bg-destructive" : isIncome ? "bg-success" : "bg-gradient-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{formatAED(actual)} {isIncome ? "earned" : "spent"}</span>
            <span>
              {formatAED(budget)}
              {diff !== 0 && budget > 0 && (
                <span className={`ml-2 font-medium ${diff > 0 ? "text-success" : "text-destructive"}`}>
                  {diff > 0 ? "+" : ""}{formatAED(diff)}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
