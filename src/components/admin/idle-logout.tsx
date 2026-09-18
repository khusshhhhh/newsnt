"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { signOut } from "@/lib/actions/admin/auth";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 60 * 1000; // warn 60s before signing out
const THROTTLE_MS = 5000; // don't reset the timer on every single mousemove
const ACTIVITY_STORAGE_KEY = "admin-last-activity";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Signs the admin out after 30 minutes with no interaction anywhere on the
 * page, warning 60 seconds ahead with a chance to stay signed in. Activity
 * in any open admin tab resets the timer in every other tab too, via a
 * shared localStorage timestamp — otherwise switching tabs to read
 * something for 25 minutes would silently sign the admin out mid-task.
 */
export function IdleLogout() {
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    let warningTimer: ReturnType<typeof setTimeout>;
    let logoutTimer: ReturnType<typeof setTimeout>;
    let lastReset = 0;

    function clearTimers() {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    }

    function doLogout() {
      clearTimers();
      if (toastIdRef.current != null) toast.dismiss(toastIdRef.current);
      toast.error("Signed out after 30 minutes of inactivity");
      void signOut();
    }

    function scheduleTimers() {
      clearTimers();
      warningTimer = setTimeout(() => {
        toastIdRef.current = toast("Still there?", {
          description: "You'll be signed out in a minute due to inactivity.",
          duration: WARNING_BEFORE_MS,
          action: { label: "Stay signed in", onClick: () => resetTimer(true) },
        });
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
      logoutTimer = setTimeout(doLogout, IDLE_TIMEOUT_MS);
    }

    function resetTimer(broadcast: boolean) {
      scheduleTimers();
      if (!broadcast) return;
      try {
        window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
      } catch {
        // Private browsing / storage disabled — this tab's own timer still works.
      }
    }

    function handleActivity() {
      const now = Date.now();
      if (now - lastReset < THROTTLE_MS) return;
      lastReset = now;
      resetTimer(true);
    }

    function handleStorage(e: StorageEvent) {
      if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) resetTimer(false);
    }

    resetTimer(true);
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener("storage", handleStorage);
      clearTimers();
    };
  }, []);

  return null;
}
