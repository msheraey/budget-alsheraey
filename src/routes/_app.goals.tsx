import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Target, Plus, Trash2, Plane, Car, GraduationCap, ShieldCheck, Home } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatAED } from "@/lib/categories";
import { goalsStore, type SavingsGoal } from "@/lib/finance-stores";

const MILESTONES = [25, 50, 75, 100];
function celebrate(pct: number) {
  const origin = { x: 0.5, y: 0.6 };
  const colors = ["#FF5E5B", "#FF7A6B", "#FFB020", "#7C5CFF", "#3FE3B0"];
  confetti({ particleCount: pct >= 100 ? 220 : 90, spread: pct >= 100 ? 140 : 80, startVelocity: 45, origin, colors, scalar: 1.05 });
  if (pct >= 100) {
    setTimeout(() => confetti({ particleCount: 140, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 200);
    setTimeout(() => confetti({ particleCount: 140, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 350);
  }
}

export const Route = createFileRoute("/_app/goals")({
  head: () => ({ meta: [{ title: "Goals — Ledger" }] }),
  component: GoalsPage,
});

const ICON_MAP = {
  ShieldCheck, Plane, Car, GraduationCap, Home, Target,
} as const;

function GoalsPage() {
  const { data: goals, loading } = goalsStore.useData();

  return (
    <div className="space-y-5 px-4 pt-6 sm:px-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Saving for</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Goals</h1>
        </div>
        <GoalDialog />
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-lg">No goals yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first savings goal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => <GoalCard key={g.id} g={g} />)}
        </div>
      )}
    </div>
  );
}

function GoalCard({ g }: { g: SavingsGoal }) {
  const pct = g.target_amount > 0 ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
  const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
  const Icon = ICON_MAP[g.icon as keyof typeof ICON_MAP] ?? Target;
  const target = g.target_date ? new Date(g.target_date) : null;

  async function quickAdd(amount: number) {
    try {
      await goalsStore.update(g.id, { current_amount: Number(g.current_amount) + amount });
      toast.success(`+${formatAED(amount)} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function del() {
    if (!confirm("Delete this goal?")) return;
    await goalsStore.remove(g.id);
    toast.success("Deleted");
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-investment/15 text-investment">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold">{g.name}</h3>
            {target && (
              <p className="text-[11px] text-muted-foreground">
                Target {target.toLocaleDateString("en-AE", { month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
        <button onClick={del} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm tabular-nums">
        <span className="font-display text-2xl font-semibold">
          AED {formatAED(Number(g.current_amount))}
        </span>
        <span className="text-muted-foreground">of {formatAED(Number(g.target_amount))}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
        <div className="h-full rounded-full bg-gradient-investment" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{pct.toFixed(0)}% complete</span>
        <span>AED {formatAED(remaining)} to go</span>
      </div>

      <div className="mt-3 flex gap-2">
        {[100, 500, 1000].map((a) => (
          <Button key={a} variant="outline" size="sm" onClick={() => quickAdd(a)} className="flex-1">
            +{a}
          </Button>
        ))}
      </div>
    </article>
  );
}

function GoalDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [date, setDate] = useState("");
  const [icon, setIcon] = useState<keyof typeof ICON_MAP>("Target");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !target) return toast.error("Name & target required");
    try {
      await goalsStore.add({
        name, target_amount: Number(target), current_amount: Number(current) || 0,
        target_date: date || null, icon, color: "violet",
      });
      toast.success("Goal created");
      setOpen(false); setName(""); setTarget(""); setCurrent("0"); setDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1 bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /> New</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New savings goal</DialogTitle>
          <DialogDescription>Set a target and track progress.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-2"><Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency Fund" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Target (AED)</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
            <div className="space-y-2"><Label>Current</Label>
              <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Target date (optional)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Icon</Label>
            <Select value={icon} onValueChange={(v) => setIcon(v as keyof typeof ICON_MAP)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(ICON_MAP).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
