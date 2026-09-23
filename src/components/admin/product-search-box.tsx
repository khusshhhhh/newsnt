import { AdminSearchBox } from "@/components/admin/admin-search-box";

export function ProductSearchBox({ initialQuery }: { initialQuery: string }) {
  return <AdminSearchBox initialQuery={initialQuery} placeholder="Search by name or SKU…" label="Search products" />;
}
