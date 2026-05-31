import { useState } from "react";
import { Plus } from "lucide-react";
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
import { addTransaction } from "@/lib/transactions-store";

const GROUP_ORDER: CategoryGroup[] = ["income", "fixed", "variable", "savings"];

export function AddTransactionDialog({ defaultMonth }: { defaultMonth: Date }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => defaultMonth.toISOString().slice(0, 10));

  const visibleCats = CATEGORIES.filter((c) =>
    type === "income" ? c.group === "income" : c.group !== "income"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) {
      toast.error("Pick a category and amount");
      return;
    }
    addTransaction({
      category: categoryId,
      amount: Number(amount),
      type,
      occurred_on: date,
      note: note || null,
    });
    toast.success("Transaction added");
    setOpen(false);
    setAmount("");
    setNote("");
    setCategoryId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 bg-gradient-primary shadow-glow hover:opacity-90">
          <Plus className="h-4 w-4" />
          Add transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New transaction</DialogTitle>
          <DialogDescription>Track an expense or income against your budget.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Tabs value={type} onValueChange={(v) => { setType(v as "expense" | "income"); setCategoryId(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {GROUP_ORDER.filter((g) => visibleCats.some((c) => c.group === g)).map((g) => (
                  <SelectGroup key={g}>
                    <SelectLabel>{GROUP_LABELS[g]}</SelectLabel>
                    {visibleCats.filter((c) => c.group === g).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
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
            <Input placeholder="e.g. supermarket run" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" className="bg-gradient-primary">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
