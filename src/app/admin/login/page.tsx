import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Aakar Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage the catalog.
        </p>
        <LoginForm redirectTo={redirectTo ?? "/admin"} />
      </div>
    </div>
  );
}
