"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-4 rounded-full px-3 py-2.5 text-lg text-slate-700 transition-colors hover:bg-slate-100 [&_svg]:size-6",
        active && "font-bold text-slate-900",
      )}
    >
      <span className="relative">
        {icon}
        {badge}
      </span>
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}
