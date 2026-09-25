"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeAdminRole, inviteAdmin, removeAdmin, type TeamMember } from "@/lib/actions/admin/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AdminRole } from "@/lib/supabase/types";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "sales", label: "Sales" },
];

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Never";
}

export function TeamManager({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("editor");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>, done: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(done);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              const { emailed } = await inviteAdmin({ email, role });
              toast.success(emailed ? `Invite sent to ${email}` : `${email} added — but the invite email couldn't be sent`);
              setEmail("");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't invite");
            }
          });
        }}
      >
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="invite-email">Invite by email</Label>
          <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" loading={pending} loadingText="Inviting…">
          Send invite
        </Button>
      </form>

      <div className="divide-y divide-border rounded-xl border border-border">
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          // Owners can't be removed, and an owner can't change another owner's role.
          const otherOwner = m.role === "owner" && !isSelf;
          return (
            <div key={m.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-foreground">{m.email}</span>
                  {isSelf && <Badge variant="secondary">You</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(m.createdAt)} · Last sign-in {formatDate(m.lastSignInAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Role for ${m.email}`}
                  value={m.role}
                  disabled={pending || otherOwner}
                  title={otherOwner ? "Owners can't change another owner's role" : undefined}
                  onChange={(e) => run(() => changeAdminRole(m.userId, e.target.value as AdminRole), "Role updated")}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {!isSelf && m.role !== "owner" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (!window.confirm(`Remove admin access for ${m.email}? They'll be signed out of the admin panel.`)) return;
                      run(() => removeAdmin(m.userId), `${m.email} removed`);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
