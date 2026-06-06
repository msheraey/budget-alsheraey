import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
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

  const now = new Date();
  const startStr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const endStr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  const actuals = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (t.occurred_on >= startStr && t.occurred_on < endStr) {
        m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
      }
    }
    return m;
  }, [txns, startStr, endStr]);

  const budgetFor = (id: string) =>
    budgets.find((b) => b.category === id)?.amount ?? categoryById(id)?.budget ?? 0;

  const groups: CategoryGroup[] = [...GROUP_ORDER.filter((g) => g !== "income"), "income"];

  const totalBudget = CATEGORIES.filter((c) => c.group !== "income").reduce((s, c) => s + budgetFor(c.id), 0);
  const totalActual = CATEGORIES.filter((c) => c.group !== "income").reduce((s, c) => s + (actuals.get(c.id) ?? 0), 0);

  return (
    <div className="space-y-6 px-4 pt-6 sm:px-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Plan</p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Monthly budget</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Total budget <span className="text-foreground font-semibold">AED {formatAED(totalBudget)}</span>
          {" · "}Actual <span className="text-foreground font-semibold">AED {formatAED(totalActual)}</span>
        </p>
      </header>

      {groups.map((g) => (
        <BudgetGroup
          key={g} group={g}
          actuals={actuals}
          budgetFor={budgetFor}
        />
      ))}
    </div>
  );
}

function BudgetGroup({
  group, actuals, budgetFor,
}: {
  group: CategoryGroup;
  actuals: Map<string, number>;
  budgetFor: (id: string) => number;
}) {
  const cats = CATEGORIES.filter((c) => c.group === group);
  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-3">
        <h2 className="font-display text-base font-semibold">{GROUP_LABELS[group]}</h2>
      </div>
      <ul className="divide-y divide-border">
        {cats.map((c) => (
          <BudgetRow
            key={c.id}
            id={c.id}
            name={c.name}
            actual={actuals.get(c.id) ?? 0}
            budget={budgetFor(c.id)}
            isIncome={group === "income"}
          />
        ))}
      </ul>
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
              {diff !== 0 && (
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
