import { notFound } from "next/navigation";
import { isDepartment } from "@/lib/department";
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

  return (
    <>
      <SiteHeader department={department} />
      <main className="flex-1">{children}</main>
      <SiteFooter department={department} />
    </>
  );
}
