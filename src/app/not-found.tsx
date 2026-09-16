import Link from "next/link";
import { Container } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-20 items-center justify-center">
        <Link href="/" className="font-heading text-xl font-black tracking-[0.08em] text-foreground">
          AAKAR
        </Link>
      </header>
      <Container
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center py-24 text-center"
      >
        <span className="font-heading text-7xl font-black text-foreground/15">404</span>
        <h1 className="mt-4 font-heading text-3xl text-foreground">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-8`}>
          Back home
        </Link>
      </Container>
    </div>
  );
}
