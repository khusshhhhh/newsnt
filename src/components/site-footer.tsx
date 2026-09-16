"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Container } from "@/components/container";
import {
  departmentCopy,
  departmentHref,
  otherDepartment,
  seriesIndexHref,
  type Department,
} from "@/lib/department";

export function SiteFooter({ department }: { department?: Department }) {
  const other = department ? otherDepartment(department) : undefined;

  return (
    <footer className="border-t border-border bg-foreground text-background">
      <Container className="py-14">
        <div className="flex flex-col justify-between gap-8 border-b border-background/15 pb-10 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-background/50">Newsletter</p>
            <p className="mt-1 text-lg text-background">
              Stay up to date on new series and finishes
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              toast.success("Thanks — you're on the list.");
              form.reset();
            }}
            className="flex w-full max-w-sm items-center gap-3 border-b border-background/30 pb-2 sm:w-auto"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="w-full bg-transparent text-sm text-background placeholder:text-background/40 focus:outline-none"
            />
            <button type="submit" className="shrink-0 text-sm text-background hover:opacity-80">
              Subscribe →
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-heading text-lg font-black tracking-[0.06em] text-background">AAKAR</p>
            <p className="mt-2 text-sm text-background/60">
              Tapware, sanitaryware &amp; door hardware.
            </p>
          </div>

          <FooterColumn title="Sanitary & Tapware">
            <FooterLink href={departmentHref("sanitary-tapware")}>Overview</FooterLink>
            <FooterLink href={seriesIndexHref("sanitary-tapware")}>Series</FooterLink>
          </FooterColumn>

          <FooterColumn title="Door Hardware">
            <FooterLink href={departmentHref("door-hardware")}>Overview</FooterLink>
            <FooterLink href={seriesIndexHref("door-hardware")}>Collections</FooterLink>
          </FooterColumn>

          <FooterColumn title="Support">
            <FooterLink href="/admin/login">Admin</FooterLink>
            {department && other && (
              <FooterLink href={departmentHref(other)}>
                Shop {departmentCopy(other).shortLabel}
              </FooterLink>
            )}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-background/15 pt-6 text-xs text-background/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aakar. All rights reserved.</p>
          <Link href="/" className="hover:text-background">
            Home
          </Link>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
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
