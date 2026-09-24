"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import {
  createAndSendQuote,
  searchAdminCustomers,
  searchAdminProducts,
  upsertAdminCustomer,
} from "@/lib/actions/admin/quotes";
import {
  LineItemEditor,
  includedLines,
  toQuoteLineItems,
  type EditableLine,
} from "@/components/admin/line-item-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice } from "@/lib/format";
import { DEPARTMENTS, departmentCopy, type Department } from "@/lib/department";
import type { AdminInquiryProduct, AdminInquiryProductVariant } from "@/lib/inquiry-lines";
import type { Discount } from "@/lib/discount";

export type QuoteBuilderInitial = {
  parentQuoteId: string;
  parentQuoteNumber: string;
  customer: CustomerResult;
  department: Department;
  lines: EditableLine[];
  notes: string;
  discount: Discount | null;
};

type CustomerResult = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: Department | null;
};

/** Debounces a query into a server-action call, cancelling stale calls by request id. */
function useDebouncedSearch<T>(query: string, search: (q: string) => Promise<T[]>, delay = 300) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const term = query.trim();

  useEffect(() => {
    const id = ++requestId.current;
    if (!term) return;

    const timer = setTimeout(() => {
      setLoading(true);
      search(term)
        .then((data) => {
          if (requestId.current === id) setResults(data);
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return { results: term ? results : [], loading: term ? loading : false };
}

/** Builds and sends a quote. With `initial` it starts as a revision of an earlier quote (same customer, lines and notes). */
export function QuoteBuilder({ initial }: { initial?: QuoteBuilderInitial } = {}) {
  const router = useRouter();
  const [submitting, startSubmit] = useTransition();

  const [customer, setCustomer] = useState<CustomerResult | null>(initial?.customer ?? null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [department, setDepartment] = useState<Department>(initial?.department ?? "sanitary-tapware");
  const [lines, setLines] = useState<EditableLine[]>(initial?.lines ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [discount, setDiscount] = useState<Discount | null>(initial?.discount ?? null);

  const [productQuery, setProductQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const customerSearch = useDebouncedSearch(customerQuery, searchAdminCustomers);
  const productSearch = useDebouncedSearch(productQuery, (q) => searchAdminProducts(q, department));

  function selectCustomer(c: CustomerResult) {
    setCustomer(c);
    setCustomerQuery("");
    if (c.department) setDepartment(c.department);
  }

  function addLine(product: AdminInquiryProduct, variant?: AdminInquiryProductVariant) {
    const line: EditableLine = {
      key: `${product.id}-${variant?.id ?? "base"}-${crypto.randomUUID()}`,
      include: true,
      name: product.name,
      variantLabel: variant?.color_name ?? null,
      sku: variant?.sku ?? product.sku,
      seriesName: product.series?.name ?? null,
      quantity: 1,
      unitPrice: variant?.price ?? product.price,
    };
    setLines((prev) => [...prev, line]);
    setExpandedProductId(null);
    setProductQuery("");
  }

  async function handleSubmit() {
    if (includedLines(lines).length === 0) {
      toast.error("Add at least one product");
      return;
    }

    let customerId = customer?.id;
    if (!customerId) {
      if (!newName.trim() || !newEmail.trim()) {
        toast.error("Search for a customer or fill in the new-customer fields");
        return;
      }
      try {
        const created = await upsertAdminCustomer({
          name: newName,
          email: newEmail,
          phone: newPhone || undefined,
          department,
        });
        if (!created) throw new Error("Could not save this customer");
        customerId = created.id;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save this customer");
        return;
      }
    }

    startSubmit(async () => {
      try {
        await createAndSendQuote({
          customerId: customerId!,
          department,
          notes,
          items: toQuoteLineItems(lines),
          discount,
          parentQuoteId: initial?.parentQuoteId ?? null,
        });
        toast.success("Quote sent");
        router.push("/admin/quotes");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send quote");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-heading text-lg text-foreground">Customer</h2>

        {customer ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{customer.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {customer.email}
                {customer.phone ? ` · ${customer.phone}` : ""}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setCustomer(null)}>
              <X className="size-4" />
            </Button>
          </div>
        ) : addingCustomer ? (
          <div className="mt-2 flex flex-col gap-2.5 rounded-lg border border-border/60 p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <Input placeholder="Phone (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setAddingCustomer(false)}>
              Search existing customer instead
            </Button>
          </div>
        ) : (
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="pl-9"
            />
            {customerSearch.loading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}

            {customerQuery.trim() && (
              <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border/60 p-1">
                {customerSearch.results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="rounded-md p-2 text-left text-sm hover:bg-accent"
                  >
                    <p className="text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </button>
                ))}
                {!customerSearch.loading && customerSearch.results.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">No matches.</p>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => setAddingCustomer(true)}
            >
              <UserPlus className="size-3.5" />
              New customer
            </Button>
          </div>
        )}
      </section>

      <section>
        <Label htmlFor="quote-department">Department</Label>
        <Select
          value={department}
          onValueChange={(v) => setDepartment(v as Department)}
          items={Object.fromEntries(DEPARTMENTS.map((d) => [d, departmentCopy(d).label]))}
        >
          <SelectTrigger id="quote-department" className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {departmentCopy(d).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section>
        <h2 className="font-heading text-lg text-foreground">Products</h2>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Search by name or SKU…"
            className="pl-9"
          />
          {productSearch.loading && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {productQuery.trim() && (
          <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border/60 p-1">
            {productSearch.results.map((product) => (
              <div key={product.id}>
                <button
                  type="button"
                  onClick={() =>
                    product.variants.length > 0
                      ? setExpandedProductId((prev) => (prev === product.id ? null : product.id))
                      : addLine(product)
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {product.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {product.series?.name ? `${product.series.name} · ` : ""}
                      {product.sku ?? "No SKU"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {product.variants.length > 0 ? `${product.variants.length} finishes` : formatPrice(product.price)}
                  </span>
                </button>
                {expandedProductId === product.id && (
                  <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-3">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => addLine(product, variant)}
                        className="flex items-center justify-between gap-2 rounded-md p-1.5 text-left text-xs hover:bg-accent"
                      >
                        <span className="text-foreground">
                          {variant.color_name}
                          <span className="ml-1.5 text-muted-foreground">{variant.sku ?? "No SKU"}</span>
                        </span>
                        <span className="text-muted-foreground">{formatPrice(variant.price ?? product.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!productSearch.loading && productSearch.results.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No matches.</p>
            )}
          </div>
        )}

        {lines.length > 0 && (
          <div className="mt-4">
            <LineItemEditor lines={lines} onChange={setLines} discount={discount} onDiscountChange={setDiscount} />
          </div>
        )}
      </section>

      <section>
        <Label htmlFor="quote-notes">Notes for customer (optional)</Label>
        <Textarea
          id="quote-notes"
          rows={3}
          className="mt-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Lead time, delivery, or payment terms…"
        />
      </section>

      <Button type="button" loading={submitting} loadingText="Sending…" onClick={handleSubmit} className="self-start">
        Send quote
      </Button>
    </div>
  );
}
