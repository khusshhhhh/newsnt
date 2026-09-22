"use client";

import { useEffect, type RefObject } from "react";

/** Ctrl/Cmd+S submits the form instead of triggering the browser's save-page dialog. */
export function useSaveShortcut(formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formRef]);
}
