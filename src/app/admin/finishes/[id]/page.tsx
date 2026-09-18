import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinishForm } from "@/components/admin/finish-form";

export default async function EditFinishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: finish } = await supabase.from("finishes").select("*").eq("id", id).single();

  if (!finish) notFound();

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Edit finish</h1>
      <div className="mt-8">
        <FinishForm finish={finish} />
      </div>
    </div>
  );
}
