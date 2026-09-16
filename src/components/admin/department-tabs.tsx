import Link from "next/link";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, departmentCopy, type Department } from "@/lib/department";

export function DepartmentTabs({
  basePath,
  active,
}: {
  basePath: string;
  active?: Department;
}) {
  const tabs: { label: string; href: string; value?: Department }[] = [
    { label: "All", href: basePath, value: undefined },
    ...DEPARTMENTS.map((d) => ({
      label: departmentCopy(d).label,
      href: `${basePath}?department=${d}`,
      value: d,
    })),
  ];

  return (
    <div className="flex gap-1 rounded-full border border-border p-1 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={cn(
            "rounded-full px-3 py-1.5 transition-colors",
            active === tab.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
