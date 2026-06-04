import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Txn = {
  id: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  added_by: string | null;
  payment_method: string | null;
  created_at: string;
};

type Listener = (txns: Txn[]) => void;
let cache: Txn[] = [];
let loaded = false;
let loadingPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(cache);
}

async function load() {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) {
      cache = data as Txn[];
      loaded = true;
      emit();
    }
  })();
  return loadingPromise;
}

let channelStarted = false;
function startRealtime() {
  if (channelStarted) return;
  channelStarted = true;
  supabase
    .channel("transactions-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transactions" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as Txn;
          if (!cache.find((t) => t.id === row.id)) cache = [row, ...cache];
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as Txn;
          cache = cache.map((t) => (t.id === row.id ? row : t));
        } else if (payload.eventType === "DELETE") {
          const row = payload.old as Txn;
          cache = cache.filter((t) => t.id !== row.id);
        }
        emit();
      },
    )
    .subscribe();
}

export function useTransactions(): { data: Txn[]; loading: boolean } {
  const [data, setData] = useState<Txn[]>(cache);
  const [loading, setLoading] = useState(!loaded);

  useEffect(() => {
    listeners.add(setData);
    startRealtime();
    if (!loaded) {
      load().finally(() => setLoading(false));
    } else {
      setData(cache);
      setLoading(false);
    }
    return () => {
      listeners.delete(setData);
    };
  }, []);

  return { data, loading };
}

export async function addTransaction(input: Omit<Txn, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("transactions")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  const row = data as Txn;
  if (!cache.find((t) => t.id === row.id)) {
    cache = [row, ...cache];
    emit();
  }
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<Txn, "id" | "created_at">>,
) {
  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const row = data as Txn;
  cache = cache.map((t) => (t.id === row.id ? row : t));
  emit();
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
  cache = cache.filter((t) => t.id !== id);
  emit();
}
