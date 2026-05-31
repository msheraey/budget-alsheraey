// Budget category definitions, derived from the original budget tracker.
// All amounts are in AED.

export type CategoryGroup = "income" | "fixed" | "variable" | "savings";

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  budget: number;
}

export const CATEGORIES: Category[] = [
  // Income
  { id: "my-salary", name: "My salary", group: "income", budget: 6500 },
  { id: "wife-salary", name: "Wife salary", group: "income", budget: 7000 },
  { id: "other-income", name: "Other income", group: "income", budget: 0 },

  // Fixed expenses
  { id: "loan-emi", name: "Loan EMI", group: "fixed", budget: 0 },
  { id: "rent", name: "Rent", group: "fixed", budget: 2900 },
  { id: "school-fees", name: "School fees", group: "fixed", budget: 1000 },
  { id: "phone-bill", name: "Phone bill", group: "fixed", budget: 400 },
  { id: "electricity-water", name: "Electricity & water", group: "fixed", budget: 400 },
  { id: "wife-transport", name: "Wife transport", group: "fixed", budget: 500 },
  { id: "wife-house-payment", name: "Wife house payment", group: "fixed", budget: 550 },
  { id: "petrol", name: "Petrol", group: "fixed", budget: 1320 },
  { id: "salik", name: "Salik", group: "fixed", budget: 240 },
  { id: "vehicle-maintenance", name: "Vehicle maintenance", group: "fixed", budget: 200 },

  // Variable expenses
  { id: "food-groceries", name: "Food & groceries", group: "variable", budget: 2000 },
  { id: "son-activities", name: "Son activities", group: "variable", budget: 200 },
  { id: "personal-clothing", name: "Personal & clothing", group: "variable", budget: 300 },
  { id: "miscellaneous", name: "Miscellaneous", group: "variable", budget: 200 },

  // Savings & buffer
  { id: "emergency-buffer", name: "Emergency buffer", group: "savings", budget: 675 },
  { id: "monthly-savings", name: "Monthly savings", group: "savings", budget: 300 },
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
