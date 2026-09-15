import { SeriesForm } from "@/components/admin/series-form";

export default function NewSeriesPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">New series</h1>
      <div className="mt-8">
        <SeriesForm />
      </div>
    </div>
  );
}
