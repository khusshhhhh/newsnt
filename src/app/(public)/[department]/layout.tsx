import { notFound } from "next/navigation";
import { DEPARTMENTS, isDepartment } from "@/lib/department";
import { getCategories } from "@/lib/data/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
