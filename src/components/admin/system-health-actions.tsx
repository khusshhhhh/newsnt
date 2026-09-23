"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { clearErrorEvents, retryInquiryNotifications } from "@/lib/actions/admin/system";
import { Button } from "@/components/ui/button";

export function RetryNotificationsButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      loading={pending}
      loadingText="Retrying…"
      onClick={() =>
        startTransition(async () => {
          try {
            const { sent, stillFailing } = await retryInquiryNotifications();
            if (stillFailing > 0) toast.error(`${sent} sent, ${stillFailing} still failing — check the email settings.`);
            else toast.success(`${sent} notification${sent === 1 ? "" : "s"} sent`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Retry failed");
          }
        })
      }
    >
      Retry emails
    </Button>
  );
}

export function ClearErrorsButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      loading={pending}
      loadingText="Clearing…"
      onClick={() => {
        if (!window.confirm("Clear all recorded server errors?")) return;
        startTransition(async () => {
          try {
            await clearErrorEvents();
            toast.success("Errors cleared");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't clear errors");
          }
        });
      }}
    >
      Clear
    </Button>
  );
}
