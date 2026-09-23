import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuoteBuilder, type QuoteBuilderInitial } from "@/components/admin/quote-builder";
import { editableLinesFromQuoteItems } from "@/lib/quote-lines";
import { isDepartment } from "@/lib/department";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  let initial: QuoteBuilderInitial | undefined;
  if (from && /^[0-9a-f-]{36}$/i.test(from)) {
    const supabase = await createClient();
    const { data: quote } = await supabase
      .from("quotes")
      .select("id, quote_number, department, items, notes, customer:customers(id, name, email, phone, department)")
      .eq("id", from)
      .maybeSingle();
    if (quote?.customer && isDepartment(quote.department)) {
      initial = {
        parentQuoteId: quote.id,
        parentQuoteNumber: quote.quote_number,
        customer: quote.customer,
        department: quote.department,
        lines: editableLinesFromQuoteItems(quote.items),
        notes: quote.notes ?? "",
      };
    }
  }

  return (
    <div>
      <Link
        href="/admin/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Quotes
      </Link>

      <h1 className="mt-3 font-heading text-2xl text-foreground">
        {initial ? `Revise ${initial.parentQuoteNumber}` : "New quote"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {initial
          ? "Adjust the lines or notes, then send — it goes out as a new version with its own accept link."
          : "Pick a customer, add products with the finish and SKU you want quoted, then send it."}
      </p>

      <div className="mt-6 max-w-xl">
        <QuoteBuilder initial={initial} />
      </div>
    </div>
  );
}
