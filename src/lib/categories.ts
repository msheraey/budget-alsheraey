// Budget category definitions, derived from the original budget tracker.
// All amounts are in AED.

import {
  Home, Utensils, Pizza, Car, Fuel, Zap, HeartPulse, Baby, ShoppingBag,
  Tv, PiggyBank, GraduationCap, Phone, Wallet, Banknote, ShieldCheck,
  Wrench, Briefcase, MapPin, Plus, CreditCard, ParkingCircle, Train,
  Coffee, Cookie, Droplet, Shirt, ToyBrick, Backpack, Users, Pill,
  Smile, Sparkles, Dumbbell, Gift, HeartHandshake, FileText, AlertTriangle,
  Moon, IdCard, Plane, ShieldHalf, Repeat, HandCoins,
  type LucideIcon,
} from "lucide-react";

export type CategoryGroup =
  | "income"
  | "fixed"
  | "credit_cards"
  | "transport"
  | "food"
  | "family"
  | "health"
  | "lifestyle"
  | "annual"
  | "other"
  | "savings";

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
  { id: "my-salary",      name: "Mohammed",       group: "income", budget: 6500, icon: Briefcase,  color: "primary" },
  { id: "wife-salary",    name: "Aprille salary", group: "income", budget: 7000, icon: Briefcase,  color: "primary" },
  { id: "hamouda-debt",   name: "Hamouda debt",   group: "income", budget: 0,    icon: HandCoins,  color: "primary" },
  { id: "other-income",   name: "Other income",   group: "income", budget: 0,    icon: Plus,       color: "primary" },

  // Fixed expenses
  { id: "rent",                name: "Rent",                 group: "fixed", budget: 2900, icon: Home,          color: "destructive" },
  { id: "loan-emi",            name: "Loan EMI",             group: "fixed", budget: 0,    icon: Banknote,      color: "destructive" },
  { id: "school-fees",         name: "School fees",          group: "fixed", budget: 1000, icon: GraduationCap, color: "destructive" },
  { id: "phone-bill",          name: "Du",                   group: "fixed", budget: 400,  icon: Phone,         color: "destructive" },
  { id: "electricity-water",   name: "SEWA",                 group: "fixed", budget: 400,  icon: Zap,           color: "destructive" },
  { id: "wife-transport",      name: "Carlift",              group: "fixed", budget: 500,  icon: Car,           color: "destructive" },
  { id: "wife-house-payment",  name: "Aprille house payment",group: "fixed", budget: 550,  icon: Home,          color: "destructive" },

  // Credit cards
  { id: "cc-adcb",             name: "ADCB",              group: "credit_cards", budget: 0, icon: CreditCard, color: "destructive" },
  { id: "cc-emirates-islamic", name: "Emirates Islamic",  group: "credit_cards", budget: 0, icon: CreditCard, color: "destructive" },
  { id: "cc-enbd",             name: "ENBD",              group: "credit_cards", budget: 0, icon: CreditCard, color: "destructive" },
  { id: "cc-mashreq",          name: "Mashreq",           group: "credit_cards", budget: 0, icon: CreditCard, color: "destructive" },
  { id: "cc-tabby-mohammed",   name: "Tabby Mohammed",    group: "credit_cards", budget: 0, icon: CreditCard, color: "destructive" },
  { id: "cc-tabby-aprille",    name: "Tabby Aprille",     group: "credit_cards", budget: 0, icon: CreditCard, color: "destructive" },

  // Transport
  { id: "petrol",              name: "Fuel",                group: "transport", budget: 1320, icon: Fuel,           color: "destructive" },
  { id: "salik",               name: "Salik",               group: "transport", budget: 240,  icon: MapPin,         color: "destructive" },
  { id: "parking",             name: "Parking",             group: "transport", budget: 0,    icon: ParkingCircle,  color: "destructive" },
  { id: "nol",                 name: "Nol",                 group: "transport", budget: 0,    icon: Train,          color: "destructive" },
  { id: "taxi",                name: "Taxi",                group: "transport", budget: 0,    icon: Car,            color: "destructive" },
  { id: "vehicle-maintenance", name: "Vehicle maintenance", group: "transport", budget: 200,  icon: Wrench,         color: "destructive" },
  

  // Food
  { id: "food-groceries",      name: "Grocery",  group: "food", budget: 2000, icon: Utensils, color: "destructive" },
  { id: "food",                name: "Food",     group: "food", budget: 0,    icon: Utensils, color: "destructive" },
  { id: "food-delivery",       name: "Delivery", group: "food", budget: 400,  icon: Pizza,    color: "destructive" },
  { id: "eat-out",             name: "Eat out",  group: "food", budget: 0,    icon: Coffee,   color: "destructive" },
  { id: "bakery",              name: "Bakery",   group: "food", budget: 0,    icon: Cookie,   color: "destructive" },
  { id: "water",               name: "Water",    group: "food", budget: 0,    icon: Droplet,  color: "destructive" },

  // Family
  { id: "son-activities",      name: "Kids activities", group: "family", budget: 200, icon: Baby,     color: "destructive" },
  { id: "kids-clothing",       name: "Kids clothing",   group: "family", budget: 0,   icon: Shirt,    color: "destructive" },
  { id: "kids-toys",           name: "Kids toys",       group: "family", budget: 0,   icon: ToyBrick, color: "destructive" },
  { id: "kids-supplies",       name: "Kids supplies",   group: "family", budget: 0,   icon: Backpack, color: "destructive" },
  { id: "family-outings",      name: "Family outings",  group: "family", budget: 0,   icon: Users,    color: "destructive" },

  // Health
  { id: "healthcare",          name: "Healthcare", group: "health", budget: 200, icon: HeartPulse, color: "destructive" },
  { id: "pharmacy",            name: "Pharmacy",   group: "health", budget: 0,   icon: Pill,       color: "destructive" },
  { id: "dental",              name: "Dental",     group: "health", budget: 0,   icon: Smile,      color: "destructive" },

  // Personal & lifestyle
  { id: "personal-clothing",   name: "Shopping",      group: "lifestyle", budget: 300, icon: ShoppingBag,    color: "destructive" },
  { id: "personal-care",       name: "Personal care", group: "lifestyle", budget: 0,   icon: Sparkles,       color: "destructive" },
  { id: "gym",                 name: "Gym",           group: "lifestyle", budget: 0,   icon: Dumbbell,       color: "destructive" },
  { id: "entertainment",       name: "Entertainment", group: "lifestyle", budget: 200, icon: Tv,             color: "destructive" },
  { id: "gifts",               name: "Gifts",         group: "lifestyle", budget: 0,   icon: Gift,           color: "destructive" },
  { id: "charity",             name: "Charity",       group: "lifestyle", budget: 0,   icon: HeartHandshake, color: "destructive" },

  // Annual payments
  { id: "visa-renewal",        name: "Visa renewal",   group: "annual", budget: 0, icon: FileText,       color: "destructive" },
  { id: "car-fines",           name: "Car fines",      group: "annual", budget: 0, icon: AlertTriangle,  color: "destructive" },
  { id: "car-renewal",         name: "Car renewal",    group: "annual", budget: 0, icon: FileText,       color: "destructive" },
  { id: "eid",                 name: "Eid",            group: "annual", budget: 0, icon: Moon,           color: "destructive" },
  { id: "license",             name: "License",        group: "annual", budget: 0, icon: IdCard,         color: "destructive" },
  { id: "flight-tickets",      name: "Flight tickets", group: "annual", budget: 0, icon: Plane,          color: "destructive" },

  // Other
  { id: "insurance",           name: "Insurance",     group: "other", budget: 0,   icon: ShieldHalf, color: "destructive" },
  { id: "subscriptions",       name: "Subscriptions", group: "other", budget: 0,   icon: Repeat,     color: "destructive" },
  { id: "miscellaneous",       name: "Miscellaneous", group: "other", budget: 200, icon: Wallet,     color: "destructive" },

  // Savings & buffer
  { id: "emergency-buffer",    name: "Emergency buffer", group: "savings", budget: 675, icon: ShieldCheck, color: "savings" },
  { id: "monthly-savings",     name: "Monthly savings",  group: "savings", budget: 300, icon: PiggyBank,   color: "savings" },
];

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  income: "Income",
  fixed: "Fixed expenses",
  credit_cards: "Credit cards",
  transport: "Transport",
  food: "Food",
  family: "Family",
  health: "Health",
  lifestyle: "Personal & lifestyle",
  annual: "Annual payments",
  other: "Other",
  savings: "Savings & buffer",
};

export const GROUP_ORDER: CategoryGroup[] = [
  "income",
  "fixed",
  "credit_cards",
  "transport",
  "food",
  "family",
  "health",
  "lifestyle",
  "annual",
  "other",
  "savings",
];

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
export const MEMBERS = ["Mohammed", "Aprille"] as const;
