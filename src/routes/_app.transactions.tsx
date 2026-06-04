import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { categoryById, formatAED } from "@/lib/categories";
import {
  deleteTransaction,
  useTransactions,
  type Txn,
} from "@/lib/transactions-store";

export const Route = createFileRoute("/_app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Ledger" },
      { name: "description", content: "All income and expense transactions." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data: txns, loading } = useTransactions();
  const [editing, setEditing] = useState<Txn | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // Group by date
  const groups = groupByDate(txns);

  return (
    <div className="space-y-5 px-4 pt-6 sm:px-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Activity</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Transactions</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading ? "Loading…" : `${txns.length} ${txns.length === 1 ? "entry" : "entries"}`}
          </p>
        </div>
        <AddTransactionDialog defaultMonth={new Date()} />
      </header>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : txns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-display text-lg">No transactions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the + button to add your first.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([dateStr, items]) => (
            <section key={dateStr}>
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {formatGroupDate(dateStr)}
              </p>
              <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {items.map((t) => {
                  const cat = categoryById(t.category);
                  const Icon = cat?.icon ?? Wallet;
                  const isIncome = t.type === "income";
                  return (
                    <li key={t.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{cat?.name ?? t.category}</p>
                          {t.added_by && (
                            <Badge variant="outline" className="border-border bg-secondary/50 px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                              {t.added_by}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {t.payment_method ?? "—"}{t.note ? ` · ${t.note}` : ""}
                        </p>
                      </div>
                      <p className={`shrink-0 font-display text-sm font-semibold tabular-nums ${isIncome ? "text-success" : "text-foreground"}`}>
                        {isIncome ? "+" : "−"} {formatAED(t.amount)}
                      </p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditing(t)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t.id)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <AddTransactionDialog
          editing={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function groupByDate(txns: Txn[]): [string, Txn[]][] {
  const map = new Map<string, Txn[]>();
  for (const t of txns) {
    const k = t.occurred_on;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function formatGroupDate(s: string) {
  const d = new Date(s);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "Today";
  if (dd.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-AE", { weekday: "short", day: "2-digit", month: "short" });
}
