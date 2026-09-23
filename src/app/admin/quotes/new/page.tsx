import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteBuilder } from "@/components/admin/quote-builder";

export default function NewQuotePage() {
  return (
    <div>
      <Link
        href="/admin/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Quotes
      </Link>

      <h1 className="mt-3 font-heading text-2xl text-foreground">New quote</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a customer, add products with the finish and SKU you want quoted, then send it.
      </p>

      <div className="mt-6 max-w-xl">
        <QuoteBuilder />
      </div>
    </div>
  );
}
