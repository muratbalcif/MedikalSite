"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { authClient, clientApiFetch } from "@/lib/api/client";

const links = [
  { href: "/account", label: "Hesabım" },
  { href: "/account/orders", label: "Siparişlerim" },
  { href: "/account/notifications", label: "Bildirimler" },
  { href: "/account/favorites", label: "Favorilerim" },
  { href: "/account/addresses", label: "Adreslerim" },
  { href: "/account/alerts", label: "Stok Bildirimlerim" },
  { href: "/account/current-account", label: "Cari Hesabım" },
  { href: "/account/bank-transfers", label: "Havale / EFT" },
  { href: "/account/settings", label: "Ayarlar" },
  { href: "/hesap-silme", label: "Hesabı sil" },
];

export function AccountNav() {
  const unread = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () =>
      clientApiFetch<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 60_000,
  });

  const unreadCount = unread.data?.count ?? 0;

  return (
    <aside className="rounded-lg border bg-white p-4">
      <nav className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between gap-2 hover:text-primary"
          >
            <span>{link.label}</span>
            {link.href === "/account/notifications" && unreadCount > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        ))}
        <button
          type="button"
          className="mt-2 text-left text-red-600"
          onClick={() => {
            void authClient.logout().then(() => {
              window.location.href = "/";
            });
          }}
        >
          Çıkış
        </button>
      </nav>
    </aside>
  );
}
