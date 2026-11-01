"use client";

import Link from "next/link";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";

const links = [
  { href: "/products", label: "Ürünler", permission: "product.read" },
  { href: "/categories", label: "Kategoriler", permission: "category.read" },
  { href: "/brands", label: "Markalar", permission: "brand.read" },
  {
    href: "/imports/products",
    label: "Toplu Ürün Aktarımı",
    permission: "import.create",
  },
  {
    href: "/imports/prices",
    label: "Toplu Fiyat Güncelleme",
    permission: "import.create",
  },
  {
    href: "/imports/stock",
    label: "Toplu Stok Güncelleme",
    permission: "import.create",
  },
];

export default function CatalogPage() {
  const { can } = usePermissions();

  return (
    <ModulePage
      permission={[
        "product.read",
        "category.read",
        "brand.read",
        "import.create",
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {links
          .filter((link) => can(link.permission))
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#d9e8ef]"
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-900">
                {link.label}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Listeyi aç →</p>
            </Link>
          ))}
      </div>
    </ModulePage>
  );
}
