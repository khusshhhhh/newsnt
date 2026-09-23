import { AdminSearchBox } from "@/components/admin/admin-search-box";

export function CustomerSearchBox({ initialQuery }: { initialQuery: string }) {
  return (
    <AdminSearchBox initialQuery={initialQuery} placeholder="Search by name, email or phone…" label="Search customers" />
  );
}
