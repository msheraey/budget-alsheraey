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
import {
  CATEGORIES,
  GROUP_LABELS,
  GROUP_ORDER,
  MEMBERS,
  PAYMENT_METHODS,
  type CategoryGroup,
} from "@/lib/categories";
import {
  addTransaction,
  updateTransaction,
  type Txn,
} from "@/lib/transactions-store";


type Props =
  | { defaultMonth: Date; editing?: undefined; controlled?: undefined; open?: undefined; onOpenChange?: undefined }
  | { defaultMonth: Date; controlled: true; open: boolean; onOpenChange: (o: boolean) => void; editing?: undefined }
  | { editing: Txn; open: boolean; onOpenChange: (o: boolean) => void; defaultMonth?: undefined; controlled?: undefined };

export function AddTransactionDialog(props: Props) {
  const isEdit = "editing" in props && !!props.editing;
  const isControlled = isEdit || ("controlled" in props && props.controlled);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? (props.open as boolean) : internalOpen;
  const setOpen = isControlled ? (props.onOpenChange as (o: boolean) => void) : setInternalOpen;

  const initialDate = isEdit
    ? (props.editing as Txn).occurred_on
    : (props.defaultMonth as Date).toISOString().slice(0, 10);

  const [type, setType] = useState<"expense" | "income">(isEdit ? (props.editing as Txn).type : "expense");
  const [categoryId, setCategoryId] = useState<string>(isEdit ? (props.editing as Txn).category : "");
  const [amount, setAmount] = useState(isEdit ? String((props.editing as Txn).amount) : "");
  const [note, setNote] = useState(isEdit ? (props.editing as Txn).note ?? "" : "");
  const [date, setDate] = useState(initialDate);
  const [addedBy, setAddedBy] = useState<string>(
    isEdit ? (props.editing as Txn).added_by ?? MEMBERS[0] : MEMBERS[0],
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    isEdit ? (props.editing as Txn).payment_method ?? PAYMENT_METHODS[0] : PAYMENT_METHODS[0],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && open) {
      const e = props.editing as Txn;
      setType(e.type);
      setCategoryId(e.category);
      setAmount(String(e.amount));
      setNote(e.note ?? "");
      setDate(e.occurred_on);
      setAddedBy(e.added_by ?? MEMBERS[0]);
      setPaymentMethod(e.payment_method ?? PAYMENT_METHODS[0]);
    }
  }, [isEdit, open, isEdit ? (props.editing as Txn) : null]);

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
        added_by: addedBy,
        payment_method: paymentMethod,
      };
      if (isEdit) {
        await updateTransaction((props.editing as Txn).id, payload);
        toast.success("Updated");
      } else {
        await addTransaction(payload);
        toast.success("Saved");
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
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Edit transaction" : "Quick add"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Update and save." : "Log it in under 5 seconds."}
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
            <Label>Amount (AED)</Label>
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-2xl font-display tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_ORDER.filter((g) => visibleCats.some((c) => c.group === g)).map((g) => (
                  <SelectGroup key={g}>
                    <SelectLabel>{GROUP_LABELS[g]}</SelectLabel>
                    {visibleCats
                      .filter((c) => c.group === g)
                      .map((c) => {
                        const Icon = c.icon;
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="inline-flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" /> {c.name}
                            </span>
                          </SelectItem>
                        );
                      })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Added by</Label>
              <Select value={addedBy} onValueChange={setAddedBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEMBERS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. supermarket"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
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
