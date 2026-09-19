"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Container } from "@/components/container";
import { Logo } from "@/components/logo";
import { subscribeNewsletter } from "@/lib/actions/newsletter";
import {
  aboutHref,
  categoryHref,
  departmentCopy,
  departmentHref,
  otherDepartment,
  projectsHref,
  seriesIndexHref,
  type Department,
} from "@/lib/department";
import type { Category } from "@/lib/supabase/types";

export function SiteFooter({
  department,
  categoriesByDepartment = {},
}: {
  department?: Department;
  categoriesByDepartment?: Partial<Record<Department, Category[]>>;
}) {
  const other = department ? otherDepartment(department) : undefined;
  const [state, formAction, pending] = useActionState(subscribeNewsletter, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Thanks — you're on the list.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <footer className="border-t border-border bg-foreground text-background">
      <Container className="py-24 md:py-32">
        <div className="flex flex-col gap-16 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-5 text-sm leading-relaxed text-background/50">
              Tapware, sanitaryware &amp; door hardware, across six design series.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-16 gap-y-10">
            <FooterColumn title="Sanitary & Tapware">
              <FooterLink href={departmentHref("sanitary-tapware")}>Overview</FooterLink>
              <FooterLink href={seriesIndexHref("sanitary-tapware")}>Series</FooterLink>
              {(categoriesByDepartment["sanitary-tapware"] ?? []).map((c) => (
                <FooterLink key={c.id} href={categoryHref(c)}>
                  {c.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Door Hardware">
              <FooterLink href={departmentHref("door-hardware")}>Overview</FooterLink>
              <FooterLink href={seriesIndexHref("door-hardware")}>Collections</FooterLink>
              {(categoriesByDepartment["door-hardware"] ?? []).map((c) => (
                <FooterLink key={c.id} href={categoryHref(c)}>
                  {c.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title="More">
              {department && <FooterLink href={aboutHref(department)}>About</FooterLink>}
              {department && <FooterLink href={projectsHref(department)}>Projects</FooterLink>}
              {department && other && (
                <FooterLink href={departmentHref(other)}>
                  Shop {departmentCopy(other).shortLabel}
                </FooterLink>
              )}
              <FooterLink href="/admin/login">Admin</FooterLink>
            </FooterColumn>
          </nav>

          <div className="w-full max-w-xs">
            <p className="text-xs uppercase tracking-[0.15em] text-background/50">Newsletter</p>
            <p className="mt-2 text-sm text-background/80">
              New series and finishes, occasionally.
            </p>
            <form
              ref={formRef}
              action={formAction}
              className="mt-5 flex items-center gap-3 border-b border-background/25 pb-2"
            >
              {department && <input type="hidden" name="department" value={department} />}
              <input
                type="email"
                name="email"
                required
                placeholder="Email address"
                className="w-full bg-transparent text-sm text-background placeholder:text-background/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={pending}
                className="shrink-0 text-sm text-background hover:opacity-80 disabled:opacity-50"
              >
                {pending ? "…" : "Subscribe →"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-24 flex flex-col gap-3 border-t border-background/10 pt-8 text-xs text-background/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Flow. All rights reserved.</p>
          <Link href="/" className="transition-colors hover:text-background">
            Home
          </Link>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.15em] text-background/50">{title}</p>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-background/80 transition-colors hover:text-background">
      {children}
    </Link>
  );
}
