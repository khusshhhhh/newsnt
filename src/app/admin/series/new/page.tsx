import { SeriesForm } from "@/components/admin/series-form";
import { isDepartment } from "@/lib/department";

export default async function NewSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department } = await searchParams;

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">New series</h1>
      <div className="mt-8">
        <SeriesForm
          defaultDepartment={department && isDepartment(department) ? department : undefined}
        />
      </div>
    </div>
  );
}
