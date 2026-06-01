import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, GROUP_LABELS, type CategoryGroup } from "@/lib/categories";
import {
  addTransaction,
  updateTransaction,
  type Txn,
} from "@/lib/transactions-store";

const GROUP_ORDER: CategoryGroup[] = ["income", "fixed", "variable", "savings"];

type Props =
  | { defaultMonth: Date; editing?: undefined }
  | {
      editing: Txn;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      defaultMonth?: undefined;
    };

export function AddTransactionDialog(props: Props) {
  const isEdit = "editing" in props && !!props.editing;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isEdit ? props.open : internalOpen;
  const setOpen = isEdit ? props.onOpenChange : setInternalOpen;

  const [type, setType] = useState<"expense" | "income">(
    isEdit ? props.editing.type : "expense",
  );
  const [categoryId, setCategoryId] = useState<string>(
    isEdit ? props.editing.category : "",
  );
  const [amount, setAmount] = useState(isEdit ? String(props.editing.amount) : "");
  const [note, setNote] = useState(isEdit ? props.editing.note ?? "" : "");
  const [date, setDate] = useState(() =>
    isEdit
      ? props.editing.occurred_on
      : (props.defaultMonth as Date).toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && open) {
      setType(props.editing.type);
      setCategoryId(props.editing.category);
      setAmount(String(props.editing.amount));
      setNote(props.editing.note ?? "");
      setDate(props.editing.occurred_on);
    }
  }, [isEdit, open, isEdit ? props.editing : null]);

  const visibleCats = CATEGORIES.filter((c) =>
    type === "income" ? c.group === "income" : c.group !== "income",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) {
      toast.error("Pick a category and amount");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: categoryId,
        amount: Number(amount),
        type,
        occurred_on: date,
        note: note || null,
      };
      if (isEdit) {
        await updateTransaction(props.editing.id, payload);
        toast.success("Transaction updated");
      } else {
        await addTransaction(payload);
        toast.success("Transaction added");
        setAmount("");
        setNote("");
        setCategoryId("");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add transaction
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Edit transaction" : "New transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update any field and save."
              : "Track an expense or income against your budget."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v as "expense" | "income");
              setCategoryId("");
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_ORDER.filter((g) => visibleCats.some((c) => c.group === g)).map(
                  (g) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{GROUP_LABELS[g]}</SelectLabel>
                      {visibleCats
                        .filter((c) => c.group === g)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (AED)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. supermarket run"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-primary text-primary-foreground"
            >
              {saving ? "Saving…" : isEdit ? (
                <span className="inline-flex items-center gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Update
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
