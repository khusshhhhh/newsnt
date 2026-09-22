"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  Tags,
  History,
  Inbox,
  Palette,
  Star,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/series", label: "Series", icon: Layers },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/finishes", label: "Finishes", icon: Palette },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/photos", label: "Photos", icon: ImageIcon },
  { href: "/admin/activity", label: "Activity", icon: History },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
