"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Every mounted paste target, so a page with several uploaders only routes a paste to the one being pointed at. */
const targets = new Set<object>();
const NON_TEXT_INPUTS = new Set(["file", "checkbox", "radio", "button", "submit", "reset", "hidden", "range", "color"]);

/**
 * Ctrl/Cmd+V an image (a screenshot, or a photo copied from another tab)
 * straight into an uploader. The paste goes to the uploader under the
 * pointer or holding focus; when a page has exactly one, a paste anywhere
 * that isn't a text field goes to it too.
 */
export function usePasteFiles(
  rootRef: RefObject<HTMLElement | null>,
  onFiles: (files: File[]) => void,
  enabled = true
) {
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return;
    const token = {};
    targets.add(token);

    function onPaste(e: ClipboardEvent) {
      const root = rootRef.current;
      if (!root) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;

      const active = document.activeElement;
      const targeted = root.matches(":hover") || root.contains(active);
      // Only text entry counts as "busy" — a focused select, checkbox or button can't take a paste anyway.
      const typing =
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          active instanceof HTMLTextAreaElement ||
          (active instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(active.type)));
      if (!targeted && (typing || targets.size > 1)) return;

      e.preventDefault();
      onFilesRef.current(files);
    }

    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("paste", onPaste);
      targets.delete(token);
    };
  }, [enabled, rootRef]);
}
