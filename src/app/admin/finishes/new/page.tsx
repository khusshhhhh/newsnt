import { FinishForm } from "@/components/admin/finish-form";

export default function NewFinishPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">New finish</h1>
      <div className="mt-6">
        <FinishForm />
      </div>
    </div>
  );
}
