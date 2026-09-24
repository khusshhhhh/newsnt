import type { Instrumentation } from "next";

// Expected, user-facing failures — not worth an error_events row.
const IGNORED_MESSAGES = [/not signed in as an admin/i, /sign-in code to continue/i, /admin role doesn't allow/i];

/**
 * Records every server error (render, route handler, server action, proxy)
 * in the `error_events` table (0031), where the admin dashboard shows it under
 * "System health". Plain REST rather than supabase-js so it works in any
 * runtime, and never throws — error reporting must not cause errors.
 *
 * To also forward to a hosted tool, set ERROR_WEBHOOK_URL (it receives the
 * same JSON as the table row), or swap this for Sentry's Next.js SDK.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err);
  if (IGNORED_MESSAGES.some((re) => re.test(message))) return;

  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  const row = {
    message: message.slice(0, 2000),
    digest,
    path: request.path.split("?")[0].slice(0, 500),
    method: request.method,
    route_type: context.routeType,
  };

  console.error("[onRequestError]", row);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tasks: Promise<unknown>[] = [];
  if (url && key) {
    tasks.push(
      fetch(`${url}/rest/v1/error_events`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(row),
      })
    );
  }
  if (process.env.ERROR_WEBHOOK_URL) {
    tasks.push(
      fetch(process.env.ERROR_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      })
    );
  }
  await Promise.allSettled(tasks);
};
