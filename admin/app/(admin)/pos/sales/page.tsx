"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import {
  posPaymentMethodLabel,
  posSaleStatusLabel,
} from "@/lib/enum-labels";
import {
  customersAdminService,
  posAdminService,
  type PosPaymentMethod,
  type PosSaleStatus,
} from "@/services/admin-api.service";

function money(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value} ₺`;
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PosSalesPage() {
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [registerId, setRegisterId] = useState("ALL");
  const [userId, setUserId] = useState("ALL");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const limit = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedCustomerSearch(customerSearch.trim()),
      300,
    );
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    dateFrom,
    dateTo,
    registerId,
    userId,
    customerFilter,
    paymentMethod,
    status,
  ]);

  const listParams = useMemo(() => {
    const params: {
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      registerId?: string;
      userId?: string;
      customerId?: string;
      paymentMethod?: PosPaymentMethod;
      status?: PosSaleStatus;
    } = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (registerId !== "ALL") params.registerId = registerId;
    if (userId !== "ALL") params.userId = userId;
    if (customerFilter === "retail") params.customerId = "retail";
    else if (customerFilter !== "ALL") params.customerId = customerFilter;
    if (paymentMethod !== "ALL") {
      params.paymentMethod = paymentMethod as PosPaymentMethod;
    }
    if (status !== "ALL") params.status = status as PosSaleStatus;
    return params;
  }, [
    debouncedSearch,
    dateFrom,
    dateTo,
    registerId,
    userId,
    customerFilter,
    paymentMethod,
    status,
  ]);

  const listQuery = useQuery({
    queryKey: ["admin-pos-sales", page, limit, listParams],
    queryFn: () => posAdminService.listSales(page, limit, listParams),
  });

  const registersQuery = useQuery({
    queryKey: ["admin-pos-registers"],
    queryFn: () => posAdminService.listRegisters(),
  });

  const cashiersQuery = useQuery({
    queryKey: ["admin-pos-cashiers"],
    queryFn: () => posAdminService.listCashiers(),
  });

  const customersQuery = useQuery({
    queryKey: ["admin-pos-customer-search", debouncedCustomerSearch],
    queryFn: () =>
      customersAdminService.list(1, 20, {
        search: debouncedCustomerSearch || undefined,
      }),
    enabled: can("customer.read"),
  });

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta;
  const totalPages = meta
    ? Math.max(1, Math.ceil(meta.total / meta.limit))
    : 1;

  return (
    <ModulePage permission="pos.read">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">POS</p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
            Satışlar
          </h1>
          <p className="text-sm text-slate-600">
            Windows POS satışları (salt okunur). İade / iptal bu ekranda yok.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Sale no (POS-20260923-000123)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[16rem] flex-1 rounded-md border px-3 py-1.5 text-sm font-mono"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
            title="Başlangıç"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
            title="Bitiş"
          />
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Kasa: Tümü</option>
            {(registersQuery.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Kasiyer: Tümü</option>
            {(cashiersQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Müşteri: Tümü</option>
            <option value="retail">Perakende (misafir)</option>
            {(customersQuery.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.firstName} ${c.lastName}`.trim() || c.email}
              </option>
            ))}
          </select>
          {can("customer.read") ? (
            <input
              type="search"
              placeholder="Müşteri ara…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
            />
          ) : null}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Ödeme: Tümü</option>
            <option value="CASH">Nakit</option>
            <option value="CARD">Kart</option>
            <option value="BANK_TRANSFER">Havale / EFT</option>
            <option value="ON_ACCOUNT">Açık hesap</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Durum: Tümü</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
            <option value="REFUNDED">İade</option>
          </select>
        </div>

        {listQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : listQuery.error ? (
          <p className="text-sm text-red-600">POS satışları alınamadı.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Kayıt bulunamadı.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Sale No</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Kasa</th>
                  <th className="px-4 py-3 font-medium">Kasiyer</th>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Toplam</th>
                  <th className="px-4 py-3 font-medium">Ödeme</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/pos/sales/${row.id}`}
                        className="font-mono text-xs text-[#1b6b8f] underline"
                      >
                        {row.saleNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDt(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.registerCode}</div>
                      <div className="text-xs text-slate-500">
                        {row.registerName}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.cashierName}</td>
                    <td className="px-4 py-3">
                      {row.customerName ?? (
                        <span className="text-slate-400">Perakende</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {money(row.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.paymentMethods
                        .map((m) => posPaymentMethodLabel(m))
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {posSaleStatusLabel(row.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-slate-500">
              Toplam {meta.total} · Sayfa {page}/{totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ModulePage>
  );
}
