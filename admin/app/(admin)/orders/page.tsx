"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  orderStatusLabel,
  shippingStatusLabel,
} from "@/lib/enum-labels";
import { ordersService } from "@/services/admin-api.service";

const ORDER_STATUSES = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

const PAYMENT_STATUSES = [
  "ALL",
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
] as const;

function customerName(order: {
  customer?: { firstName: string; lastName: string; email: string };
}) {
  if (!order.customer) return "—";
  const name = `${order.customer.firstName} ${order.customer.lastName}`.trim();
  return name || order.customer.email;
}

function shippingLabel(order: {
  shipping: { status: string; trackingNumber: string | null } | null;
  status: string;
}) {
  if (!order.shipping) {
    if (order.status === "SHIPPED" || order.status === "DELIVERED") {
      return "Kargo kaydı yok";
    }
    return "—";
  }
  if (order.shipping.trackingNumber) {
    return order.shipping.trackingNumber;
  }
  return shippingStatusLabel(order.shipping.status);
}

export default function OrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof ORDER_STATUSES)[number]>("ALL");
  const [paymentStatus, setPaymentStatus] =
    useState<(typeof PAYMENT_STATUSES)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const listQuery = useQuery({
    queryKey: [
      "admin-orders",
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      ordersService.list(1, 50, {
        status: status === "ALL" ? undefined : status,
        paymentStatus: paymentStatus === "ALL" ? undefined : paymentStatus,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  const items = listQuery.data?.items ?? [];

  return (
    <ModulePage permission="order.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Siparişler
            </h1>
            <p className="text-sm text-slate-600">
              Siparişleri filtreleyin, detaya gidin ve operasyonları yönetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Sipariş / müşteri / e-posta"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof ORDER_STATUSES)[number])
              }
            >
              {ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === "ALL"
                    ? "Tüm durumlar"
                    : (ORDER_STATUS_LABEL[value] ?? value)}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(
                  e.target.value as (typeof PAYMENT_STATUSES)[number],
                )
              }
            >
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === "ALL"
                    ? "Tüm ödemeler"
                    : (PAYMENT_STATUS_LABEL[value] ?? value)}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Başlangıç tarihi"
            />
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Bitiş tarihi"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {listQuery.isLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Yükleniyor…</p>
          ) : listQuery.isError ? (
            <p className="px-4 py-6 text-sm text-red-600">
              Siparişler yüklenemedi.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Sipariş No</th>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Toplam</th>
                  <th className="px-4 py-3 font-medium">Ödeme</th>
                  <th className="px-4 py-3 font-medium">Sipariş Durumu</th>
                  <th className="px-4 py-3 font-medium">Kargo</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => router.push(`/orders/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.orderNumber}
                    </td>
                    <td className="px-4 py-3">{customerName(row)}</td>
                    <td className="px-4 py-3">
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      {row.totalAmount} {row.currency}
                    </td>
                    <td className="px-4 py-3">
                      {row.payment
                        ? (PAYMENT_STATUS_LABEL[row.payment.status] ??
                          row.payment.status)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {orderStatusLabel(row.status)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {shippingLabel(row)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-[#1b6b8f] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
          <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Toplam: {listQuery.data?.meta.total ?? 0}
          </div>
        </div>
      </div>
    </ModulePage>
  );
}
