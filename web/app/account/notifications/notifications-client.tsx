"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { clientApiFetch } from "@/lib/api/client";
import type { Paginated } from "@/types/api";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  message: string;
  data: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Preferences = {
  orderNotifications: boolean;
  paymentNotifications: boolean;
  stockAlerts: boolean;
  campaignNotifications: boolean;
  systemNotifications: boolean;
};

const PREF_LABELS: Array<{ key: keyof Preferences; label: string }> = [
  { key: "orderNotifications", label: "Sipariş bildirimleri" },
  { key: "paymentNotifications", label: "Ödeme bildirimleri" },
  { key: "stockAlerts", label: "Stok uyarıları" },
  { key: "campaignNotifications", label: "Kampanya bildirimleri" },
  { key: "systemNotifications", label: "Sistem bildirimleri" },
];

function notificationHref(item: NotificationItem): string | null {
  const data = item.data ?? {};
  const entityType = item.entityType ?? (data.entityType as string | undefined);
  const entityId =
    item.entityId ?? (typeof data.entityId === "string" ? data.entityId : null);

  if (entityType === "ORDER" && entityId) {
    return `/account/orders/${entityId}`;
  }

  if (entityType === "PRODUCT") {
    const slug =
      typeof data.productSlug === "string" ? data.productSlug : null;
    const productId =
      typeof data.productId === "string" ? data.productId : entityId;
    if (slug) return `/products/${slug}`;
    if (productId) return `/products/${productId}`;
  }

  if (entityType === "PAYMENT") {
    const orderId =
      typeof data.orderId === "string" ? data.orderId : entityId;
    if (orderId) return `/account/orders/${orderId}`;
  }

  return null;
}

export function NotificationsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      clientApiFetch<Paginated<NotificationItem>>(
        "/notifications?page=1&limit=50",
      ),
  });

  const prefs = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () =>
      clientApiFetch<Preferences>("/notifications/preferences"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      clientApiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      clientApiFetch("/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  const updatePrefs = useMutation({
    mutationFn: (patch: Partial<Preferences>) =>
      clientApiFetch<Preferences>("/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-preferences"], data);
    },
  });

  async function handleClick(item: NotificationItem) {
    if (!item.readAt) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        // still navigate
      }
    }
    const href = notificationHref(item);
    if (href) {
      router.push(href);
    }
  }

  const items = list.data?.items ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Bildirimler
        </h1>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Tümünü okundu işaretle
          </Button>
        ) : null}
      </div>

      {list.isLoading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Bildiriminiz yok" />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const href = notificationHref(item);
            const unread = !item.readAt;
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={
                        unread
                          ? "font-semibold text-navy"
                          : "font-medium text-slate-700"
                      }
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {item.body || item.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  {unread ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  ) : null}
                </div>
              </>
            );

            return (
              <li key={item.id}>
                {href ? (
                  <button
                    type="button"
                    className={`w-full rounded-lg border p-4 text-left transition hover:border-accent/40 ${
                      unread ? "bg-primary-soft/60" : "bg-white"
                    }`}
                    onClick={() => void handleClick(item)}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className={`rounded-lg border p-4 ${
                      unread ? "bg-primary-soft/60" : "bg-white"
                    }`}
                  >
                    {content}
                    {unread ? (
                      <button
                        type="button"
                        className="mt-2 text-sm font-semibold text-primary"
                        onClick={() => markRead.mutate(item.id)}
                      >
                        Okundu işaretle
                      </button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Bildirim tercihleri</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hangi bildirimleri almak istediğinizi seçin.
        </p>
        {prefs.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Yükleniyor…</p>
        ) : prefs.data ? (
          <ul className="mt-3 space-y-3">
            {PREF_LABELS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={prefs.data[key]}
                  disabled={updatePrefs.isPending}
                  onChange={(e) =>
                    updatePrefs.mutate({ [key]: e.target.checked })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-red-600">Tercihler yüklenemedi.</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Daha fazla hesap ayarı için{" "}
          <Link href="/account/settings" className="text-primary underline">
            Ayarlar
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
