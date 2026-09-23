import { VerifyForm } from "./verify-form";

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Check your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code we just sent you to finish signing in.
        </p>
        <VerifyForm redirectTo={redirectTo ?? "/admin"} />
      </div>
    </div>
  );
}
