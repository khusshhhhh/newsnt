import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The login page renders inside this layout too but has no chrome of its own;
  // middleware already keeps unauthenticated users out of every other /admin route.
  if (!user) return <>{children}</>;

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] bg-background">
      <aside className="flex flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6">
        <div>
          <Link href="/admin" className="mb-8 block font-heading text-lg text-sidebar-foreground">
            AAKAR
          </Link>
          <AdminNav />
        </div>
        <div className="flex flex-col gap-2">
          <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="overflow-y-auto p-8">{children}</main>
    </div>
  );
}
