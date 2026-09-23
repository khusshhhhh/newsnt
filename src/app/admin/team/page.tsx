import { notFound } from "next/navigation";
import { requireAdmin, roleCan } from "@/lib/admin-guard";
import { listTeam } from "@/lib/actions/admin/team";
import { TeamManager } from "@/components/admin/team-manager";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const { role, user } = await requireAdmin();
  if (!roleCan(role, "admins")) notFound();
  const team = await listTeam();

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">Team</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Who can sign in to the admin panel, and what they can do. Everyone signs in with a password plus an emailed
        code.
      </p>
      <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <dt className="font-medium text-foreground">Owner</dt>
          <dd>Everything, including managing the team.</dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="font-medium text-foreground">Editor</dt>
          <dd>Catalog (products, series, categories, finishes) and review/photo moderation.</dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="font-medium text-foreground">Sales</dt>
          <dd>Inquiries, customers, quotes, orders and reports. Can view the catalog.</dd>
        </div>
      </dl>
      <TeamManager members={team} currentUserId={user.id} />
    </div>
  );
}
