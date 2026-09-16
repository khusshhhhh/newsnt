import Link from "next/link";
import { Container } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";

export default function DepartmentNotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <span className="font-heading text-7xl font-black text-foreground/15">404</span>
      <h1 className="mt-4 font-heading text-3xl text-foreground">We couldn&apos;t find that</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        That product, series, or category doesn&apos;t exist or may have been unpublished.
      </p>
      <Link href="/" className={`${buttonVariants()} mt-8`}>
        Back home
      </Link>
    </Container>
  );
}
