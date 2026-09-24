import type { AdminScope } from "@/lib/admin-guard";
import type { DashboardStats } from "@/lib/supabase/types";

export type AdminNavLink = {
  href: string;
  label: string;
  icon: string;
  /** Hidden from roles that can't use the page. Omitted = everyone. */
  scope?: AdminScope;
  /** Which dashboard stat to show as a count badge. */
  badge?: keyof DashboardStats;
};

export type AdminNavGroup = { label: string | null; links: AdminNavLink[] };

/** Single source of truth for the admin sidebar, mobile drawer and Ctrl+K palette. Icons are lucide names resolved client-side. */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    links: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", badge: "errors_24h" },
      { href: "/admin/reports", label: "Reports", icon: "BarChart3", scope: "sales" },
    ],
  },
  {
    label: "Sales",
    links: [
      { href: "/admin/inquiries", label: "Inquiries", icon: "Inbox", scope: "sales", badge: "new_inquiries" },
      { href: "/admin/quotes", label: "Quotes", icon: "FileText", scope: "sales", badge: "quotes_needing_follow_up" },
      { href: "/admin/orders", label: "Orders", icon: "ClipboardList", scope: "sales", badge: "open_orders" },
      { href: "/admin/customers", label: "Customers", icon: "Users", scope: "sales" },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", icon: "Package" },
      { href: "/admin/series", label: "Series", icon: "Layers" },
      { href: "/admin/categories", label: "Categories", icon: "Tags" },
      { href: "/admin/finishes", label: "Finishes", icon: "Palette" },
    ],
  },
  {
    label: "Moderation",
    links: [
      { href: "/admin/reviews", label: "Reviews", icon: "Star", scope: "moderation", badge: "pending_reviews" },
      { href: "/admin/photos", label: "Photos", icon: "Image", scope: "moderation", badge: "pending_photos" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/trash", label: "Trash", icon: "Trash2" },
      { href: "/admin/team", label: "Team", icon: "ShieldCheck", scope: "admins" },
    ],
  },
];
