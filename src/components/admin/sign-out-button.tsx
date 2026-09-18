"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Reads pending state from the surrounding `<form action={signOut}>` via useFormStatus. */
export function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      loading={pending}
      loadingText="Signing out…"
      className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
    >
      Sign out
    </Button>
  );
}
