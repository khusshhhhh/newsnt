import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SavedList } from "@/components/saved-list";
import { departmentHref, isDepartment } from "@/lib/department";

type Params = { department: string };

export const metadata: Metadata = {
  title: "Saved",
  // Every visitor's list is different and lives in their own browser.
  robots: { index: false, follow: true },
};

export default async function SavedPage({ params }: { params: Promise<Params> }) {
  const { department } = await params;
  if (!isDepartment(department)) notFound();

  return (
    <Container className="py-12">
      <Breadcrumbs items={[{ name: "Home", href: departmentHref(department) }, { name: "Saved" }]} />
      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground">Saved</h1>
        <p className="mt-2 text-muted-foreground">
          Products you&apos;ve hearted, kept in this browser. Send them all as one quote request when you&apos;re ready.
        </p>
      </div>
      <SavedList department={department} />
    </Container>
  );
}
