import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2, Wallet, Search, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import {
  CATEGORIES, MEMBERS, MONTHS, PAYMENT_METHODS, GROUP_LABELS, GROUP_ORDER,
  categoryById, formatAED,
} from "@/lib/categories";
import {
  deleteTransaction, useTransactions, type Txn,
} from "@/lib/transactions-store";

type TxnSearch = { category?: string };

export const Route = createFileRoute("/_app/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — FluentBudget" },
      { name: "description", content: "All income and expense transactions." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): TxnSearch => ({
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  component: TransactionsPage,
});

const ANY = "__any__";

function TransactionsPage() {
  const search = Route.useSearch();
  const { data: txns, loading } = useTransactions();
  const [editing, setEditing] = useState<Txn | null>(null);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState<boolean>(!!search.category);
  const [fCategory, setFCategory] = useState<string>(search.category ?? ANY);
  const [fType, setFType] = useState<string>(ANY);
  const [fUser, setFUser] = useState<string>(ANY);
  const [fPayment, setFPayment] = useState<string>(ANY);
  const [fMonth, setFMonth] = useState<string>(ANY);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const t of txns) set.add(t.occurred_on.slice(0, 7));
    return [...set].sort().reverse();
  }, [txns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter((t) => {
      if (fCategory !== ANY && t.category !== fCategory) return false;
      if (fType !== ANY && t.type !== fType) return false;
      if (fUser !== ANY && (t.added_by ?? "") !== fUser) return false;
      if (fPayment !== ANY && (t.payment_method ?? "") !== fPayment) return false;
      if (fMonth !== ANY && !t.occurred_on.startsWith(fMonth)) return false;
      if (q) {
        const cat = categoryById(t.category)?.name?.toLowerCase() ?? "";
        const blob = `${cat} ${t.note ?? ""} ${t.payment_method ?? ""} ${t.added_by ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [txns, query, fCategory, fType, fUser, fPayment, fMonth]);

  const activeFilters = [
    fCategory !== ANY, fType !== ANY, fUser !== ANY, fPayment !== ANY, fMonth !== ANY,
  ].filter(Boolean).length;

  function clearFilters() {
    setFCategory(ANY); setFType(ANY); setFUser(ANY); setFPayment(ANY); setFMonth(ANY);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try { await deleteTransaction(id); toast.success("Deleted"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
  };

  const groups = groupByDate(filtered);
  const total = filtered.reduce((s, t) => s + (t.type === "expense" ? Number(t.amount) : 0), 0);

  return (
    <div className="space-y-4 px-4 pt-6 sm:px-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Activity</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Transactions</h1>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {loading ? "Loading…" : `${filtered.length} of ${txns.length} · AED ${formatAED(total)} spent`}
          </p>
        </div>
        <AddTransactionDialog defaultMonth={new Date()} />
      </header>

      {/* Search + filter toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Fuel, Talabat, School, Amazon…"
              className="h-10 rounded-xl pl-9 pr-9"
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl relative"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-5">
            <FilterSelect label="Category" value={fCategory} onChange={setFCategory}
              options={[{ value: ANY, label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.name }))]} />
            <FilterSelect label="Type" value={fType} onChange={setFType}
              options={[{ value: ANY, label: "All types" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
            <FilterSelect label="User" value={fUser} onChange={setFUser}
              options={[{ value: ANY, label: "Anyone" }, ...MEMBERS.map((m) => ({ value: m, label: m }))]} />
            <FilterSelect label="Payment" value={fPayment} onChange={setFPayment}
              options={[{ value: ANY, label: "Any method" }, ...PAYMENT_METHODS.map((p) => ({ value: p, label: p }))]} />
            <FilterSelect label="Month" value={fMonth} onChange={setFMonth}
              options={[
                { value: ANY, label: "All months" },
                ...months.map((m) => {
                  const [yy, mm] = m.split("-").map(Number);
                  return { value: m, label: `${MONTHS[mm - 1]} ${yy}` };
                }),
              ]} />
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="col-span-2 h-8 text-xs sm:col-span-5" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-display text-lg">
            {txns.length === 0 ? "No transactions yet" : "No matches"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {txns.length === 0 ? "Tap the + button to add your first." : "Try clearing the filters."}
          </p>
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
                            <span
                              title={t.added_by}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground"
                            >
                              {t.added_by[0]}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
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

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
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
