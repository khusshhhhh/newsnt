import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SeriesForm } from "@/components/admin/series-form";

export default async function EditSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: series } = await supabase.from("series").select("*").eq("id", id).single();

  if (!series) notFound();

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit series</h1>
      <div className="mt-8">
        <SeriesForm series={series} />
      </div>
    </div>
  );
}
