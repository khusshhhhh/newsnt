"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Hidden anti-spam fields for public forms — see `looksLikeBot()` in
 * lib/rate-limit.ts. Renders a decoy "company" input real visitors never see
 * or focus (simple bots fill every field), and stamps `elapsed_ms` — time
 * since the form appeared — onto the form's data whenever it's submitted,
 * via the `formdata` event (which fires for both native submits and
 * `new FormData(form)`). Forms that already set `elapsed_ms` themselves
 * (the inquiry dialog, timed from when it opened) still win, since they set
 * it after the FormData is built.
 */
export function HoneypotField() {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountedAt = Date.now();
    const form = ref.current?.closest("form");
    if (!form) return;
    function onFormData(e: FormDataEvent) {
      if (!e.formData.has("elapsed_ms")) e.formData.set("elapsed_ms", String(Date.now() - mountedAt));
    }
    form.addEventListener("formdata", onFormData);
    return () => form.removeEventListener("formdata", onFormData);
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={`${id}-company`}>Company</label>
      <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
