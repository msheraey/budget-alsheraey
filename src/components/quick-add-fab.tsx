import { useState } from "react";
import { Plus } from "lucide-react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Quick add expense"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-fab transition-transform hover:scale-105 active:scale-95 sm:bottom-24 sm:right-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <AddTransactionDialog
        controlled
        open={open}
        onOpenChange={setOpen}
        defaultMonth={new Date()}
      />
    </>
  );
}
