import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-8">
        <h1 className="font-heading text-2xl text-foreground">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your admin email and we&apos;ll send you a link to choose a new password.
        </p>
        <ForgotForm />
        <Link href="/admin/login" className="mt-4 block text-xs text-muted-foreground hover:text-foreground">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
