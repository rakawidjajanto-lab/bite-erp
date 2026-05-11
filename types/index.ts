export type TransactionCategory =
  | "INVESTMENT"
  | "SALES"
  | "SUPPLIES"
  | "OPERATIONAL"
  | "MARKETING"
  | "RND"
  | "INVENTORY"
  | "OTHER_INCOME";

export type TransactionSource =
  | "MANUAL"
  | "TOKOPEDIA"
  | "SHOPEE"
  | "PADEL"
  | "EXCEL_IMPORT";

export type RiskLevel = "CRITICAL" | "LOW" | "SAFE" | "NO_DATA";

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  INVESTMENT: "Investment",
  SALES: "Sales",
  SUPPLIES: "Supplies",
  OPERATIONAL: "Operational",
  MARKETING: "Marketing",
  RND: "R&D",
  INVENTORY: "Inventory",
  OTHER_INCOME: "Other Income",
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  INVESTMENT: "#6366f1",
  SALES: "#22c55e",
  SUPPLIES: "#f59e0b",
  OPERATIONAL: "#3b82f6",
  MARKETING: "#ec4899",
  RND: "#8b5cf6",
  INVENTORY: "#14b8a6",
  OTHER_INCOME: "#84cc16",
};
