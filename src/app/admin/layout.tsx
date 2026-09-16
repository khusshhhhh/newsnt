import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/lib/actions/admin/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The login page renders inside this layout too but has no chrome of its own;
  // middleware already keeps unauthenticated users out of every other /admin route.
  if (!user) return <>{children}</>;

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-background">
      <aside className="flex flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6">
        <div>
          <Link href="/admin" className="mb-8 block text-sidebar-foreground">
            <Logo size="sm" />
          </Link>
          <AdminNav />
        </div>
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
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main-content" className="overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
