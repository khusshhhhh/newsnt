"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/admin/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state && "success" in state) {
    return <p className="mt-6 rounded-lg bg-muted/60 p-3 text-sm text-foreground">{state.message}</p>;
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </div>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" loading={pending} loadingText="Sending…">
        Send reset link
      </Button>
    </form>
  );
}
