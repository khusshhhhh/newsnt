import type { OrderStatus } from "@/lib/supabase/types";

/** Fulfilment stages in board order. Kept out of orders-board.tsx ("use client") so the server-rendered orders page can read it too. */
export const ORDER_STAGES: { value: OrderStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in_production", label: "In production" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];
