import { useSyncExternalStore } from "react";

export type Txn = {
  id: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
};

const KEY = "ledger.transactions.v1";

function read(): Txn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Txn[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

function write(next: Txn[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

let cache: Txn[] | null = null;
let cacheRaw: string | null = null;
function getSnapshot(): Txn[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw && cache) return cache;
  cacheRaw = raw;
  cache = read();
  return cache;
}
function getServerSnapshot(): Txn[] {
  return [];
}

export function useTransactions(): Txn[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addTransaction(input: Omit<Txn, "id" | "created_at">) {
  const next: Txn = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  write([next, ...read()]);
}

export function deleteTransaction(id: string) {
  write(read().filter((t) => t.id !== id));
}
