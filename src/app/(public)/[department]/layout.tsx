import { notFound } from "next/navigation";
import { DEPARTMENTS, isDepartment } from "@/lib/department";
import { getCategories } from "@/lib/data/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Both departments are known at build time, so their pages that don't read
 * the query string (home, about, series index, projects) are prerendered
 * and served from the CDN, then refreshed when the catalog cache tag is
 * invalidated by an admin edit. Pages that read searchParams stay dynamic.
 */
export function generateStaticParams() {
  return DEPARTMENTS.map((department) => ({ department }));
}

export default async function DepartmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ department: string }>;
}) {
  const { department } = await params;
  if (!isDepartment(department)) notFound();

  const categoriesByDepartment = Object.fromEntries(
    await Promise.all(DEPARTMENTS.map(async (d) => [d, await getCategories(d)] as const))
  );

  return (
    <>
      <SiteHeader department={department} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter department={department} categoriesByDepartment={categoriesByDepartment} />
    </>
  );
}
