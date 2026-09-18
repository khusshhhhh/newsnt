"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { upsertProduct } from "@/lib/actions/admin/products";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, departmentCopy, type Department } from "@/lib/department";
import { cn } from "@/lib/utils";
import type { Category, Product, ProductSpecs, Series } from "@/lib/supabase/types";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-5">
      <div>
        <h2 className="font-heading text-sm font-medium text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** A small red asterisk marking a required field's label. */
function Required() {
  return (
    <span className="text-destructive" aria-hidden>
      {" "}
      *
    </span>
  );
}

export function ProductForm({
  product,
  series,
  categories,
  defaultDepartment = "sanitary-tapware",
}: {
  product?: Product;
  series: Series[];
  categories: Category[];
  defaultDepartment?: Department;
}) {
  const router = useRouter();
  const isNew = !product;
  const [state, formAction, pending] = useActionState(upsertProduct, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success(isNew ? "Product created" : "Product saved");
      router.push(`/admin/products/${state.id}`);
    }
  }, [state, isNew, router]);

  const [specs, setSpecs] = useState<[string, string][]>(
    Object.entries(product?.specs ?? ({} as ProductSpecs)).length
      ? Object.entries(product?.specs ?? {})
      : [["", ""]]
  );

  const initialDepartment =
    categories.find((c) => c.id === product?.category_id)?.department ?? defaultDepartment;
  const [department, setDepartment] = useState<Department>(initialDepartment);
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [seriesId, setSeriesId] = useState(product?.series_id ?? "none");

  const categoriesInDepartment = useMemo(
    () => categories.filter((c) => c.department === department),
    [categories, department]
  );
  const seriesInDepartment = useMemo(
    () => series.filter((s) => s.department === department),
    [series, department]
  );

  // Base UI's <Select.Value> shows the raw `value` unless the root is given
  // an `items` label map — otherwise a category/series select would display
  // its uuid instead of its name.
  const departmentItems = useMemo(
    () => Object.fromEntries(DEPARTMENTS.map((d) => [d, departmentCopy(d).label])),
    []
  );
  const categoryItems = useMemo(
    () => Object.fromEntries(categoriesInDepartment.map((c) => [c.id, c.name])),
    [categoriesInDepartment]
  );
  const seriesItems = useMemo(
    () => ({ none: "None", ...Object.fromEntries(seriesInDepartment.map((s) => [s.id, s.name])) }),
    [seriesInDepartment]
  );

  function handleDepartmentChange(next: Department | null) {
    if (!next) return;
    setDepartment(next);
    if (!categories.some((c) => c.id === categoryId && c.department === next)) {
      setCategoryId("");
    }
    if (seriesId !== "none" && !series.some((s) => s.id === seriesId && s.department === next)) {
      setSeriesId("none");
    }
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {product && <input type="hidden" name="id" value={product.id} />}

      <FormSection
        title="Basic details"
        description="The name and identifiers shoppers and staff will see."
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="department_filter">Department</Label>
          <Select value={department} onValueChange={handleDepartmentChange} items={departmentItems}>
            <SelectTrigger id="department_filter" className="w-full sm:w-64">
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
          <p className="text-xs text-muted-foreground">
            Filters the category and series lists below — the product&apos;s actual department
            follows whichever category you pick.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Name
              <Required />
            </Label>
            <Input id="name" name="name" defaultValue={product?.name} required autoFocus={isNew} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={product?.slug}
              placeholder="auto-generated from name if left blank"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sku">
            SKU prefix
            <Required />
          </Label>
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} placeholder="AKRLTS001" required />
          <p className="text-xs text-muted-foreground">
            Each color gets its own SKU built from this prefix, e.g. {"{prefix}"}MB for Matte Black.
          </p>
        </div>
      </FormSection>

      <FormSection title="Category" description="Where this product lives in the catalog.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category_id">
              Category
              <Required />
            </Label>
            <Select
              name="category_id"
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
              items={categoryItems}
              required
            >
              <SelectTrigger id="category_id" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categoriesInDepartment.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                {categoriesInDepartment.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    No categories in this department yet
                  </p>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="series_id">{departmentCopy(department).seriesLabel} (optional)</Label>
            <Select
              name="series_id"
              value={seriesId}
              onValueChange={(v) => setSeriesId(v ?? "none")}
              items={seriesItems}
            >
              <SelectTrigger id="series_id" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {seriesInDepartment.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {!isNew && (
        <FormSection
          title="Base price"
          description="A fallback only — each color set under “Colors” below carries its own price. This is shown when a color has no price of its own, or before any colors are added."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price (leave blank for &quot;on enquiry&quot;)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.price ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                AUD — fixed for every product
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {isNew && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Pricing is set per color once the product is created — add colors and their prices on
          the next screen.
        </p>
      )}

      <FormSection title="Specifications" description="Optional key/value details shown on the product page.">
        <div className="flex flex-col gap-2">
          {specs.map(([key, value], index) => (
            <div key={index} className="flex gap-2">
              <Input
                name="specs_key"
                placeholder="Finish"
                defaultValue={key}
                className="w-1/3"
              />
              <Input
                name="specs_value"
                placeholder="Matte black"
                defaultValue={value}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSpecs((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setSpecs((prev) => [...prev, ["", ""]])}
          >
            Add spec
          </Button>
        </div>
      </FormSection>

      <FormSection
        title="SEO"
        description="Optional overrides for the public product page's title and search snippet. Left blank, the page uses the product name and a generated description."
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meta_title">Meta title</Label>
          <Input
            id="meta_title"
            name="meta_title"
            maxLength={70}
            defaultValue={product?.meta_title ?? ""}
            placeholder={product?.name ?? "Product name"}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meta_description">Meta description</Label>
          <textarea
            id="meta_description"
            name="meta_description"
            maxLength={160}
            rows={2}
            defaultValue={product?.meta_description ?? ""}
            placeholder="Shown in search results under the title — one or two sentences."
            className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </FormSection>

      <FormSection title="Visibility" description="Controls where and whether this product appears.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display_order">Display order</Label>
            <Input
              id="display_order"
              name="display_order"
              type="number"
              defaultValue={product?.display_order ?? 0}
            />
          </div>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={product?.is_featured ?? false}
                className="h-4 w-4 rounded border-input"
              />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={product?.is_published ?? true}
                className="h-4 w-4 rounded border-input"
              />
              Published
            </label>
          </div>
        </div>
      </FormSection>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} loadingText={isNew ? "Creating…" : "Saving…"} className="w-fit">
          {isNew ? "Create product" : "Save product"}
        </Button>
        <Link
          href="/admin/products"
          className={cn(buttonVariants({ variant: "ghost" }), pending && "pointer-events-none opacity-50")}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
