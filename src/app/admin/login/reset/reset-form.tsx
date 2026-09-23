"use client";

import { useActionState } from "react";
import Link from "next/link";
import { completePasswordReset } from "@/lib/actions/admin/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ResetForm({ tokenHash }: { tokenHash: string }) {
  const [state, formAction, pending] = useActionState(completePasswordReset, null);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">
          {state.error}{" "}
          {state.error.includes("request a new one") && (
            <Link href="/admin/login/forgot" className="underline underline-offset-4">
              Request a new link
            </Link>
          )}
        </p>
      )}
      <Button type="submit" loading={pending} loadingText="Saving…">
        Save password
      </Button>
    </form>
  );
}
