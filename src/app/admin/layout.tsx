import Link from "next/link";
import { cookies } from "next/headers";
import { ExternalLink } from "lucide-react";
import { getAdminRow, getSessionUser } from "@/lib/admin-session";
import { AAL2_COOKIE_NAME, verifyAal2Cookie } from "@/lib/admin-mfa";
import { roleCan } from "@/lib/admin-guard";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { CommandPalette, CommandPaletteTrigger } from "@/components/admin/command-palette";
import { KeyboardShortcuts } from "@/components/admin/keyboard-shortcuts";
import { signOut } from "@/lib/actions/admin/auth";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { IdleLogout } from "@/components/admin/idle-logout";
import { Logo } from "@/components/logo";
import type { AdminRole } from "@/lib/supabase/types";

const ROLE_LABEL: Record<AdminRole, string> = { owner: "Owner", editor: "Editor", sales: "Sales" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSessionUser();

  // The login/verify pages render inside this layout too but have no chrome
  // of their own; middleware already keeps anyone who isn't fully signed in
  // (password + OTP) out of every other /admin route.
  const cookieStore = await cookies();
  const aal2Valid = user ? verifyAal2Cookie(cookieStore.get(AAL2_COOKIE_NAME)?.value, user.id) : false;
  if (!user || !aal2Valid) return <>{children}</>;

  const [admin, { data: stats }] = await Promise.all([
    getAdminRow(user.id),
    supabase.rpc("admin_dashboard_stats"),
  ]);
  const role: AdminRole = admin?.role ?? "owner";
  const counts = (stats ?? {}) as Record<string, number>;

  const groups = ADMIN_NAV.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.scope || roleCan(role, link.scope)),
  })).filter((group) => group.links.length > 0);

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
        <p className="px-3 text-[10px] uppercase tracking-wide text-sidebar-foreground/40">{ROLE_LABEL[role]}</p>
        <form action={signOut} className="mt-2">
          <SignOutButton />
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <IdleLogout />
      <CommandPalette groups={groups} />
      <KeyboardShortcuts />

      {/* Desktop sidebar — fixed to the viewport, so it never scrolls with the page content. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col justify-between gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="flex flex-col gap-5">
          <Link href="/admin" className="block text-sidebar-foreground">
            <Logo size="sm" />
          </Link>
          <CommandPaletteTrigger />
          <AdminNav groups={groups} counts={counts} />
        </div>
        {sidebarFooter}
      </aside>

      {/* Mobile/tablet topbar with a slide-out drawer nav — shown below the lg breakpoint. */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <Link href="/admin" className="text-sidebar-foreground">
          <Logo size="sm" />
        </Link>
        <AdminMobileNav footer={sidebarFooter} groups={groups} counts={counts} />
      </header>

      <main id="main-content" tabIndex={-1} className="p-4 outline-none sm:p-6 lg:ml-60 lg:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
