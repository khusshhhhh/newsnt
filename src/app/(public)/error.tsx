"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Container } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container
      id="main-content"
      className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center"
    >
      <TriangleAlert className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="mt-6 font-heading text-3xl text-foreground">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We couldn&apos;t load this page. Try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className={buttonVariants()}>
          Try again
        </button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back home
        </Link>
      </div>
    </Container>
  );
}
