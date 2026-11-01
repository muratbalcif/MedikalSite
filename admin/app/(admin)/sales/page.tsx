"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { StatCard } from "@/components/ui/stat-card";
import { usePermissions } from "@/hooks/use-permissions";
import {
  salePaymentMethodLabel,
  saleStatusLabel,
} from "@/lib/enum-labels";
import {
  customersAdminService,
  rbacService,
  salesService,
  type SalePaymentMethod,
  type SaleStatus,
} from "@/services/admin-api.service";

function todayInIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + deltaDays * 24 * 60 * 60 * 1000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

function formatDateTr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("tr-TR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function money(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value} ₺`;
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function personName(p: { firstName: string; lastName: string; email: string }) {
  const name = `${p.firstName} ${p.lastName}`.trim();
  return name || p.email;
}

export default function SalesPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [date, setDate] = useState(todayInIstanbul);
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [createdById, setCreatedById] = useState<string>("ALL");
  const [paymentMethod, setPaymentMethod] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const listParams = useMemo(() => {
    const params: {
      date: string;
      customerId?: string;
      retailOnly?: boolean;
      createdById?: string;
      paymentMethod?: SalePaymentMethod;
      status?: SaleStatus;
      search?: string;
    } = { date };
    if (customerFilter === "retail") {
      params.customerId = "retail";
    } else if (customerFilter !== "ALL") {
      params.customerId = customerFilter;
    }
    if (createdById !== "ALL") params.createdById = createdById;
    if (paymentMethod !== "ALL") {
      params.paymentMethod = paymentMethod as SalePaymentMethod;
    }
    if (status !== "ALL") params.status = status as SaleStatus;
    if (search.trim()) params.search = search.trim();
    return params;
  }, [date, customerFilter, createdById, paymentMethod, status, search]);

  const summaryQuery = useQuery({
    queryKey: ["admin-sales-summary", date],
    queryFn: () => salesService.dailySummary(date),
  });

  const listQuery = useQuery({
    queryKey: ["admin-sales", listParams],
    queryFn: () => salesService.list(1, 100, listParams),
  });

  const customersQuery = useQuery({
    queryKey: ["admin-sales-customers"],
    queryFn: () => customersAdminService.list(1, 100),
  });

  const adminsQuery = useQuery({
    queryKey: ["admin-sales-admins"],
    queryFn: () => rbacService.listUsers(),
  });

  const summary = summaryQuery.data;
  const items = listQuery.data?.items ?? [];

  return (
    <ModulePage permission="sale.read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Satışlar
            </h1>
            <p className="text-sm text-slate-500">
              Günlük satış / perakende POS
            </p>
          </div>
          {can("sale.create") ? (
            <Link
              href="/sales/new"
              className="rounded-md bg-[#1b6b8f] px-4 py-2 text-sm font-medium text-white hover:bg-[#16324f]"
            >
              Yeni Satış
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-medium">
            {formatDateTr(date)}
          </span>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            →
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setDate(todayInIstanbul())}
          >
            Bugün
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Toplam Satış"
            value={summary ? money(summary.totalSales) : null}
          />
          <StatCard
            label="Satış Sayısı"
            value={summary?.saleCount ?? null}
            hint={
              summary
                ? `Perakende ${summary.retailSaleCount} · Müşterili ${summary.customerSaleCount}`
                : undefined
            }
          />
          <StatCard
            label="Satılan Ürün Adedi"
            value={summary?.itemCount ?? null}
          />
          <StatCard
            label="İade Toplamı"
            value={summary ? money(summary.refundTotal) : null}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Müşteri: Tümü</option>
            <option value="retail">Perakende Satış</option>
            {(customersQuery.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.firstName} ${c.lastName}`.trim() || c.email}
              </option>
            ))}
          </select>
          <select
            value={createdById}
            onChange={(e) => setCreatedById(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Satış yapan: Tümü</option>
            {(adminsQuery.data ?? []).map((u) => (
              <option key={u.userId} value={u.userId}>
                {`${u.firstName} ${u.lastName}`.trim() || u.email}
              </option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Ödeme: Tümü</option>
            <option value="CASH">Nakit</option>
            <option value="CREDIT_CARD">Kredi Kartı</option>
            <option value="BANK_TRANSFER">Havale / EFT</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Durum: Tümü</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara (no, SKU, müşteri…)"
            className="min-w-[14rem] flex-1 rounded-md border px-3 py-1.5 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Saat</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Satış Yapan</th>
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Ödeme</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Bu güne ait satış yok.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => router.push(`/sales/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.saleNumber}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(row.createdAt).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{row.customerLabel}</td>
                    <td className="px-4 py-3">
                      {personName(row.createdBy)}
                    </td>
                    <td className="px-4 py-3">
                      {row.items.length === 1
                        ? row.items[0].productName
                        : `${row.items.length} ürün (${row.itemCount} adet)`}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {money(row.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {salePaymentMethodLabel(row.paymentMethod)}
                    </td>
                    <td className="px-4 py-3">
                      {saleStatusLabel(row.status)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales/${row.id}`}
                        className="text-[#1b6b8f] underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
}
