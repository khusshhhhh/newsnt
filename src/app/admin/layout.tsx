import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { signOut } from "@/lib/actions/admin/auth";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { IdleLogout } from "@/components/admin/idle-logout";
import { Logo } from "@/components/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The login page renders inside this layout too but has no chrome of its own;
  // middleware already keeps unauthenticated users out of every other /admin route.
  if (!user) return <>{children}</>;

  const sidebarFooter = (
    <div className="flex flex-col gap-3">
      <Link
        href="/"
        className="flex items-center gap-1.5 px-3 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
      >
        View site <ExternalLink className="size-3" />
      </Link>
      <div className="border-t border-sidebar-border pt-3">
        <p className="truncate px-3 text-xs text-sidebar-foreground/60">{user.email}</p>
        <form action={signOut} className="mt-2">
          <SignOutButton />
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <IdleLogout />

      {/* Desktop sidebar — fixed to the viewport, so it never scrolls with the page content. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col justify-between overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div>
          <Link href="/admin" className="mb-8 block text-sidebar-foreground">
            <Logo size="sm" />
          </Link>
          <AdminNav />
        </div>
        {sidebarFooter}
      </aside>

      {/* Mobile/tablet topbar with a slide-out drawer nav — shown below the lg breakpoint. */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <Link href="/admin" className="text-sidebar-foreground">
          <Logo size="sm" />
        </Link>
        <AdminMobileNav footer={sidebarFooter} />
      </header>

      <main id="main-content" className="p-4 sm:p-6 lg:ml-60 lg:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
