"use client";

import { useActionState, useMemo, useState } from "react";
import { upsertProduct } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, departmentCopy, type Department } from "@/lib/department";
import type { Category, Product, ProductSpecs, Series } from "@/lib/supabase/types";

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
  const [state, formAction, pending] = useActionState(upsertProduct, null);
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="department_filter">Department</Label>
        <Select value={department} onValueChange={handleDepartmentChange}>
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
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={product?.name} required />
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sku">SKU (optional)</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} placeholder="NR9030BZ" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category_id">Category</Label>
          <Select
            name="category_id"
            value={categoryId}
            onValueChange={(v) => setCategoryId(v ?? "")}
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
          <Select name="series_id" value={seriesId} onValueChange={(v) => setSeriesId(v ?? "none")}>
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
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue={product?.currency ?? "INR"} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Specifications</Label>
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

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save product"}
      </Button>
    </form>
  );
}
