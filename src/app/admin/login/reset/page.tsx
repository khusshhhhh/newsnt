import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Choose a password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash: tokenHash } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Choose a password</h1>
        {tokenHash ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">At least 12 characters. A passphrase works well.</p>
            <ResetForm tokenHash={tokenHash} />
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            This link is incomplete.{" "}
            <Link href="/admin/login/forgot" className="text-foreground underline underline-offset-4">
              Request a new one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
