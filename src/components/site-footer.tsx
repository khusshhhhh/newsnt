import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-heading text-lg text-foreground">AAKAR</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tapware &amp; sanitaryware, designed across six series.
          </p>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/series" className="hover:text-foreground">
            Series
          </Link>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aakar. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
