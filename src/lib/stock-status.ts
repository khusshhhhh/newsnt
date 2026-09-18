import type { StockStatus } from "@/lib/supabase/types";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  made_to_order: "Made to order",
  out_of_stock: "Out of stock",
  discontinued: "Discontinued",
};

export const STOCK_STATUSES: StockStatus[] = [
  "in_stock",
  "made_to_order",
  "out_of_stock",
  "discontinued",
];
