"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Inbox,
  Layers,
  LayoutDashboard,
  Package,
  Palette,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminNavGroup } from "@/lib/admin-nav";

export const NAV_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  ClipboardList,
  FileText,
  Image: ImageIcon,
  Inbox,
  Layers,
  LayoutDashboard,
  Package,
  Palette,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  Users,
};

/**
 * Grouped sidebar nav. `groups` arrives already filtered to what the
 * signed-in admin's role can use, and `counts` carries the badge numbers
 * (new inquiries, things to moderate, …) from admin_dashboard_stats().
 */
export function AdminNav({ groups, counts }: { groups: AdminNavGroup[]; counts: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4" aria-label="Admin">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
              {group.label}
            </p>
          )}
          {group.links.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            const Icon = NAV_ICONS[link.icon] ?? LayoutDashboard;
            const count = link.badge ? (counts[link.badge] ?? 0) : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{link.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-medium tabular-nums",
                      link.badge === "errors_24h"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-sidebar-foreground/10 text-sidebar-foreground"
                    )}
                    aria-label={`${count} pending`}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
