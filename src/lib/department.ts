export const DEPARTMENTS = ["sanitary-tapware", "door-hardware"] as const;

export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

type DepartmentCopy = {
  label: string;
  shortLabel: string;
  tagline: string;
  seriesLabel: string;
  heroLine: string;
};

const COPY: Record<Department, DepartmentCopy> = {
  "sanitary-tapware": {
    label: "Sanitary & Tapware",
    shortLabel: "S&T",
    tagline: "Basin mixers, kitchen mixers, taps and showers",
    seriesLabel: "Series",
    heroLine: "Finish is everything.",
  },
  "door-hardware": {
    label: "Door Hardware & Accessories",
    shortLabel: "Hardware",
    tagline: "Handles, hinges, locks and cabinet fittings",
    seriesLabel: "Collections",
    heroLine: "Hardware that finishes the room, not just the door.",
  },
};

export function departmentCopy(department: Department): DepartmentCopy {
  return COPY[department];
}

export function departmentHref(department: Department) {
  return `/${department}`;
}

export function seriesIndexHref(department: Department) {
  return `/${department}/series`;
}

export function aboutHref(department: Department) {
  return `/${department}/about`;
}

export function searchHref(department: Department, query?: string) {
  const base = `/${department}/search`;
  return query ? `${base}?q=${encodeURIComponent(query)}` : base;
}

export function seriesHref(series: { department: Department; slug: string }) {
  return `/${series.department}/series/${series.slug}`;
}

export function categoryHref(category: { department: Department; slug: string }) {
  return `/${category.department}/category/${category.slug}`;
}

export function seriesCategoryHref(
  series: { department: Department; slug: string },
  category: { slug: string }
) {
  return `/${series.department}/series/${series.slug}/${category.slug}`;
}

export function productHref(product: { department: Department; slug: string }) {
  return `/${product.department}/product/${product.slug}`;
}

export function otherDepartment(department: Department): Department {
  return department === "sanitary-tapware" ? "door-hardware" : "sanitary-tapware";
}
