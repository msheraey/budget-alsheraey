import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generic shared realtime store factory ----------------------------------
function makeStore<T extends { id: string }>(table: string, orderBy?: { col: string; asc?: boolean }) {
  let cache: T[] = [];
  let loaded = false;
  let loadingPromise: Promise<void> | null = null;
  const listeners = new Set<(t: T[]) => void>();
  let channelStarted = false;

  function emit() { for (const l of listeners) l(cache); }

  async function load() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      let q = supabase.from(table).select("*");
      if (orderBy) q = q.order(orderBy.col, { ascending: orderBy.asc ?? false });
      const { data, error } = await q;
      if (!error && data) { cache = data as T[]; loaded = true; emit(); }
    })();
    return loadingPromise;
  }

  function startRealtime() {
    if (channelStarted) return;
    channelStarted = true;
    supabase
      .channel(`${table}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as T;
          if (!cache.find((r) => r.id === row.id)) cache = [row, ...cache];
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as T;
          cache = cache.map((r) => (r.id === row.id ? row : r));
        } else if (payload.eventType === "DELETE") {
          const row = payload.old as T;
          cache = cache.filter((r) => r.id !== row.id);
        }
        emit();
      })
      .subscribe();
  }

  function useData(): { data: T[]; loading: boolean } {
    const [data, setData] = useState<T[]>(cache);
    const [loading, setLoading] = useState(!loaded);
    useEffect(() => {
      listeners.add(setData);
      startRealtime();
      if (!loaded) load().finally(() => setLoading(false));
      else { setData(cache); setLoading(false); }
      return () => { listeners.delete(setData); };
    }, []);
    return { data, loading };
  }

  async function add(input: Omit<T, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from(table).insert(input as never).select().single();
    if (error) throw error;
    const row = data as T;
    if (!cache.find((r) => r.id === row.id)) { cache = [row, ...cache]; emit(); }
    return row;
  }

  async function update(id: string, patch: Partial<T>) {
    const { data, error } = await supabase.from(table).update(patch as never).eq("id", id).select().single();
    if (error) throw error;
    const row = data as T;
    cache = cache.map((r) => (r.id === row.id ? row : r));
    emit();
    return row;
  }

  async function upsert(input: Partial<T>, onConflict: string) {
    const { data, error } = await supabase.from(table).upsert(input as never, { onConflict }).select().single();
    if (error) throw error;
    const row = data as T;
    const exists = cache.find((r) => r.id === row.id);
    cache = exists ? cache.map((r) => (r.id === row.id ? row : r)) : [row, ...cache];
    emit();
    return row;
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    cache = cache.filter((r) => r.id !== id);
    emit();
  }

  return { useData, add, update, upsert, remove };
}

// Types
export type CategoryBudget = {
  id: string; category: string; amount: number;
  created_at: string; updated_at: string;
};
export type SavingsGoal = {
  id: string; name: string; target_amount: number; current_amount: number;
  target_date: string | null; icon: string; color: string;
  created_at: string; updated_at: string;
};
export type Subscription = {
  id: string; name: string; amount: number; billing_cycle: string;
  next_renewal: string | null; icon: string;
  created_at: string; updated_at: string;
};
export type Debt = {
  id: string; name: string; debt_type: string; balance: number;
  original_amount: number; monthly_payment: number; due_date: string | null;
  created_at: string; updated_at: string;
};
export type Achievement = { id: string; key: string; unlocked_at: string };

export const budgetsStore = makeStore<CategoryBudget>("category_budgets");
export const goalsStore = makeStore<SavingsGoal>("savings_goals", { col: "created_at", asc: false });
export const subscriptionsStore = makeStore<Subscription>("subscriptions", { col: "next_renewal", asc: true });
export const debtsStore = makeStore<Debt>("debts", { col: "created_at", asc: false });
export const achievementsStore = makeStore<Achievement>("achievements", { col: "unlocked_at", asc: false });
