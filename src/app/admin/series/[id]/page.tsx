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
  const { data: series } = await supabase
    .from("series")
    .select("*, series_images(storage_path, display_order)")
    .eq("id", id)
    .single();

  if (!series) notFound();

  const images = [...(series.series_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((image) => image.storage_path);

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit series</h1>
      <div className="mt-8">
        <SeriesForm series={series} images={images} />
      </div>
    </div>
  );
}
