"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import {
  accountingService,
  customersAdminService,
} from "@/services/admin-api.service";

export default function CollectionsPage() {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const summary = useQuery({
    queryKey: ["collections-summary"],
    queryFn: () => accountingService.collectionsSummary(),
  });

  const customersQuery = useQuery({
    queryKey: ["collections-customer-search", customerSearch],
    queryFn: () =>
      customersAdminService.list(1, 10, {
        search: customerSearch || undefined,
      }),
    enabled: !selectedCustomer && customerSearch.trim().length >= 2,
  });

  const list = useQuery({
    queryKey: [
      "collections",
      selectedCustomer?.id ?? "",
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      accountingService.collections(1, 50, {
        customerId: selectedCustomer?.id || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const customerHits = customersQuery.data?.items ?? [];

  return (
    <ModulePage permission="accounting.read">
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Tahsilatlar
        </h1>
        <p className="text-sm text-slate-500">
          Onaylanmış havale bildirimlerinden oluşan gerçek tahsilatlar.
        </p>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 text-sm">
            <p className="text-slate-500">Bugünkü tahsilat</p>
            <p className="text-xl font-semibold">
              {summary.data?.todayCollections ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <p className="text-slate-500">Bu ay tahsilat</p>
            <p className="text-xl font-semibold">
              {summary.data?.monthCollections ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <p className="text-slate-500">Bekleyen havale</p>
            <p className="text-xl font-semibold">
              {summary.data?.pendingTransfers ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <p className="text-slate-500">Reddedilen</p>
            <p className="text-xl font-semibold">
              {summary.data?.rejectedTransfers ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <div className="relative min-w-[240px] flex-1">
            <input
              value={
                selectedCustomer ? selectedCustomer.label : customerSearch
              }
              onChange={(e) => {
                setSelectedCustomer(null);
                setCustomerSearch(e.target.value);
              }}
              placeholder="Müşteri ara (ad / e-posta)"
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
            {selectedCustomer ? (
              <button
                type="button"
                className="mt-1 text-xs text-[#16324f] underline"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                }}
              >
                Filtreyi temizle
              </button>
            ) : null}
            {!selectedCustomer && customerSearch.trim().length >= 2 ? (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-white text-sm shadow">
                {customersQuery.isLoading ? (
                  <li className="px-2 py-1.5 text-slate-500">Aranıyor…</li>
                ) : customerHits.length === 0 ? (
                  <li className="px-2 py-1.5 text-slate-500">
                    Müşteri bulunamadı
                  </li>
                ) : (
                  customerHits.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-2 py-1.5 text-left hover:bg-slate-50"
                        onClick={() => {
                          setSelectedCustomer({
                            id: c.id,
                            label: `${c.firstName} ${c.lastName} · ${c.email}`,
                          });
                          setCustomerSearch("");
                        }}
                      >
                        {c.firstName} {c.lastName} · {c.email}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-white">
          {list.isLoading ? (
            <p className="px-3 py-4 text-sm text-slate-500">Yükleniyor…</p>
          ) : list.error ? (
            <p className="px-3 py-4 text-sm text-red-600">
              Tahsilat listesi alınamadı.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2">Müşteri</th>
                  <th className="px-3 py-2">Sipariş</th>
                  <th className="px-3 py-2">Tutar</th>
                  <th className="px-3 py-2">Banka</th>
                  <th className="px-3 py-2">Havale</th>
                  <th className="px-3 py-2">Onay</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.items ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-sm text-slate-500"
                    >
                      Filtreye uygun tahsilat yok.
                    </td>
                  </tr>
                ) : (
                  (list.data?.items ?? []).map((row) => {
                    const r = row as {
                      id: string;
                      customer?: { name: string };
                      order?: { orderNumber: string };
                      amount: string;
                      bank: string | null;
                      transferDate: string;
                      approvedDate: string | null;
                    };
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">
                          {r.customer?.name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {r.order?.orderNumber ?? "—"}
                        </td>
                        <td className="px-3 py-2">{r.amount}</td>
                        <td className="px-3 py-2">{r.bank ?? "—"}</td>
                        <td className="px-3 py-2">
                          {new Date(r.transferDate).toLocaleDateString(
                            "tr-TR",
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.approvedDate
                            ? new Date(r.approvedDate).toLocaleString("tr-TR")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
