// Budget category definitions, derived from the original budget tracker.
// All amounts are in AED.

import {
  Home, Utensils, Pizza, Car, Fuel, Zap, HeartPulse, Baby, ShoppingBag,
  Tv, PiggyBank, GraduationCap, Phone, Wallet, Banknote, ShieldCheck,
  Wrench, Briefcase, MapPin, Plus,
  type LucideIcon,
} from "lucide-react";

export type CategoryGroup = "income" | "fixed" | "variable" | "savings";

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  budget: number;
  icon: LucideIcon;
  color: string; // semantic class fragment
}

export const CATEGORIES: Category[] = [
  // Income
  { id: "my-salary",        name: "My salary",         group: "income",   budget: 6500, icon: Briefcase, color: "primary" },
  { id: "wife-salary",      name: "Aprille salary",    group: "income",   budget: 7000, icon: Briefcase, color: "primary" },
  { id: "other-income",     name: "Other income",      group: "income",   budget: 0,    icon: Plus, color: "primary" },

  // Fixed expenses
  { id: "loan-emi",            name: "Loan EMI",           group: "fixed", budget: 0,    icon: Banknote, color: "destructive" },
  { id: "rent",                name: "Rent",               group: "fixed", budget: 2900, icon: Home,     color: "destructive" },
  { id: "school-fees",         name: "School fees",        group: "fixed", budget: 1000, icon: GraduationCap, color: "destructive" },
  { id: "phone-bill",          name: "Phone bill",         group: "fixed", budget: 400,  icon: Phone,    color: "destructive" },
  { id: "electricity-water",   name: "Utilities",          group: "fixed", budget: 400,  icon: Zap,      color: "destructive" },
  { id: "wife-transport",      name: "Wife transport",     group: "fixed", budget: 500,  icon: Car,      color: "destructive" },
  { id: "wife-house-payment",  name: "Wife house payment", group: "fixed", budget: 550,  icon: Home,     color: "destructive" },
  { id: "petrol",              name: "Fuel",               group: "fixed", budget: 1320, icon: Fuel,     color: "destructive" },
  { id: "salik",               name: "Salik / tolls",      group: "fixed", budget: 240,  icon: MapPin,   color: "destructive" },
  { id: "vehicle-maintenance", name: "Vehicle maintenance",group: "fixed", budget: 200,  icon: Wrench,   color: "destructive" },

  // Variable expenses
  { id: "food-groceries",     name: "Groceries",          group: "variable", budget: 2000, icon: Utensils, color: "destructive" },
  { id: "food-delivery",      name: "Food delivery",      group: "variable", budget: 400,  icon: Pizza,    color: "destructive" },
  { id: "son-activities",     name: "Kids",               group: "variable", budget: 200,  icon: Baby,     color: "destructive" },
  { id: "personal-clothing",  name: "Shopping",           group: "variable", budget: 300,  icon: ShoppingBag, color: "destructive" },
  { id: "entertainment",      name: "Entertainment",      group: "variable", budget: 200,  icon: Tv,       color: "destructive" },
  { id: "healthcare",         name: "Healthcare",         group: "variable", budget: 200,  icon: HeartPulse, color: "destructive" },
  { id: "miscellaneous",      name: "Miscellaneous",      group: "variable", budget: 200,  icon: Wallet,   color: "destructive" },

  // Savings & buffer
  { id: "emergency-buffer",  name: "Emergency buffer",   group: "savings", budget: 675, icon: ShieldCheck, color: "savings" },
  { id: "monthly-savings",   name: "Monthly savings",    group: "savings", budget: 300, icon: PiggyBank,   color: "savings" },
];

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  income: "Income",
  fixed: "Fixed expenses",
  variable: "Variable expenses",
  savings: "Savings & buffer",
};

export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.group !== "income");
export const INCOME_CATEGORIES = CATEGORIES.filter((c) => c.group === "income");

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);

export const formatAED = (n: number) =>
  new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(n);

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const PAYMENT_METHODS = ["Cash", "Card", "Bank transfer", "Wallet"] as const;
export const MEMBERS = ["Mohammed", "Wife"] as const;
