"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { verifyOtp, resendOtp, signOut } from "@/lib/actions/admin/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function VerifyForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(verifyOtp, null);
  const [resending, startResend] = useTransition();
  const [resent, setResent] = useState(false);

  function handleResend() {
    setResent(false);
    startResend(async () => {
      const result = await resendOtp();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setResent(true);
        toast.success("New code sent");
      }
    });
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Sign-in code</Label>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          required
          className="text-center text-lg tracking-[0.5em]"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {resent && !state?.error && <p className="text-sm text-muted-foreground">New code sent — check your email.</p>}
      <Button type="submit" loading={pending} loadingText="Verifying…" className="mt-2">
        Verify and sign in
      </Button>
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
        <form action={signOut}>
          <button
            type="submit"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use a different account
          </button>
        </form>
      </div>
    </form>
  );
}
