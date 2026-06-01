import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
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
      { name: "description", content: "All your income and expense transactions." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data: txns, loading } = useTransactions();
  const [editing, setEditing] = useState<Txn | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-glow">
            Activity
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${txns.length} ${txns.length === 1 ? "entry" : "entries"} on record`}
          </p>
        </div>
        <AddTransactionDialog defaultMonth={new Date()} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-card backdrop-blur">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : txns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-lg">No transactions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first one to start tracking against your budget.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {txns.map((t) => {
              const cat = categoryById(t.category);
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{cat?.name ?? t.category}</p>
                      <Badge
                        variant="outline"
                        className={
                          t.type === "income"
                            ? "border-success/40 text-success"
                            : "border-accent/50 text-accent-foreground"
                        }
                      >
                        {t.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(t.occurred_on).toLocaleDateString("en-AE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-display text-lg font-semibold tabular-nums ${
                        t.type === "income" ? "text-success" : "text-foreground"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"} {formatAED(t.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">AED</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary-glow"
                    onClick={() => setEditing(t)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
