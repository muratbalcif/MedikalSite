"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { usePermissions } from "@/hooks/use-permissions";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const { can } = usePermissions();

  const items = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-[#16324f] text-slate-100">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d9e8ef]/80">
          ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Admin Panel
        </h1>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active =
            item.href === "/pos"
              ? pathname === "/pos"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[#f0f5f8]0/20 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
