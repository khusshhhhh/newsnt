import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; reset?: string }>;
}) {
  const { redirectTo, reset } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Flow Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage the catalog.
        </p>
        {reset && (
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground">
            Password saved — sign in with your new password.
          </p>
        )}
        <LoginForm redirectTo={redirectTo ?? "/admin"} />
        <Link
          href="/admin/login/forgot"
          className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
