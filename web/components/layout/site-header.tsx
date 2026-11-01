"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CartNavLink } from "@/components/layout/cart-nav-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLink } from "@/components/layout/nav-link";
import { SearchForm } from "@/components/layout/search-form";
import type { CategoryNode } from "@/types/api";

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenCategories(node.children));
    }
  }
  return result;
}

function CategoryBar({ categories }: { categories: CategoryNode[] }) {
  const pathname = usePathname();

  return (
    <div className="hidden bg-primary md:block">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2.5 [scrollbar-width:thin]">
        <Link
          href="/categories"
          className={clsx(
            "shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-[15px] font-semibold transition",
            pathname.startsWith("/categories")
              ? "bg-primary-light text-primary-dark"
              : "text-white/90 hover:bg-white/10 hover:text-white",
          )}
        >
          Tüm Kategoriler
        </Link>
        <Link
          href="/campaigns"
          className={clsx(
            "shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-[15px] font-semibold transition",
            pathname.startsWith("/campaigns")
              ? "bg-primary-light text-primary-dark"
              : "text-white/90 hover:bg-white/10 hover:text-white",
          )}
        >
          Kampanyalar
        </Link>
        {categories.map((cat) => {
          const href = `/categories/${cat.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={cat.id}
              href={href}
              title={cat.name}
              className={clsx(
                "max-w-[12rem] shrink-0 truncate whitespace-nowrap rounded-lg px-3.5 py-2 text-[15px] font-medium transition",
                active
                  ? "bg-primary-light text-primary-dark"
                  : "text-white/90 hover:bg-white/10 hover:text-white",
              )}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SiteHeader({ categories }: { categories: CategoryNode[] }) {
  const flat = flattenCategories(categories).slice(0, 8);

  return (
    <header className="sticky top-0 z-40 bg-surface/95 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-4">
        <Link
          href="/"
          className="shrink-0"
          aria-label="ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ"
        >
          <img
            src="/logo.svg"
            alt="ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ"
            className="h-16 w-auto object-contain"
          />
        </Link>
        <div className="hidden flex-1 md:block">
          <SearchForm />
        </div>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <NavLink href="/account" exact>
            Hesabım
          </NavLink>
          <NavLink href="/account/favorites">Favoriler</NavLink>
          <CartNavLink />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <CartNavLink compact />
          <MobileNav categories={flat} />
        </div>
      </div>
      <CategoryBar categories={flat} />
      <div className="px-4 py-3 md:hidden">
        <SearchForm />
      </div>
    </header>
  );
}
