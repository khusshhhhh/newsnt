import type { MetadataRoute } from "next";
import { getCategories, getPublishedProductSlugs, getPublishedSeries } from "@/lib/data/catalog";
import {
  DEPARTMENTS,
  categoryHref,
  departmentHref,
  productHref,
  seriesHref,
  seriesIndexHref,
} from "@/lib/department";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
  ];

  for (const department of DEPARTMENTS) {
    entries.push(
      { url: `${SITE_URL}${departmentHref(department)}`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${SITE_URL}${seriesIndexHref(department)}`, changeFrequency: "weekly", priority: 0.7 }
    );

    const [series, categories, productSlugs] = await Promise.all([
      getPublishedSeries(department),
      getCategories(department),
      getPublishedProductSlugs(department),
    ]);

    for (const s of series ?? []) {
      entries.push({ url: `${SITE_URL}${seriesHref(s)}`, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const c of categories ?? []) {
      entries.push({ url: `${SITE_URL}${categoryHref(c)}`, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const slug of productSlugs) {
      entries.push({
        url: `${SITE_URL}${productHref({ department, slug })}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
