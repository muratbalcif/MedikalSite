"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import {
  accountTxTypeLabel,
  posPaymentMethodLabel,
  posSaleStatusLabel,
} from "@/lib/enum-labels";
import {
  posAdminService,
  type AdminPosSaleDetail,
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

function personName(p: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  const name = `${p.firstName} ${p.lastName}`.trim();
  return name || p.email;
}

function estimateReturnTotal(
  sale: AdminPosSaleDetail,
  qtyByItem: Record<string, number>,
): number {
  let total = 0;
  for (const item of sale.items) {
    const qty = qtyByItem[item.id] ?? 0;
    if (qty <= 0) continue;
    const unit = Number(item.lineTotal) / item.quantity;
    total += unit * qty;
  }
  return total;
}

export default function PosSaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [returnOpen, setReturnOpen] = useState(false);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  const saleQuery = useQuery({
    queryKey: ["admin-pos-sale", id],
    queryFn: () => posAdminService.getSale(id),
  });

  const sale = saleQuery.data;
  const canRefund =
    can("pos.refund") &&
    sale?.status === "COMPLETED" &&
    (sale.items.some((i) => (i.returnableQuantity ?? 0) > 0) ?? false);

  const estimated = useMemo(() => {
    if (!sale) return 0;
    return estimateReturnTotal(sale, qtyByItem);
  }, [sale, qtyByItem]);

  function openReturn() {
    if (!sale) return;
    const initial: Record<string, number> = {};
    for (const item of sale.items) {
      initial[item.id] = 0;
    }
    setQtyByItem(initial);
    setReturnError(null);
    setReturnSuccess(null);
    setReturnOpen(true);
  }

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!sale) throw new Error("Satış yok");
      const items = Object.entries(qtyByItem)
        .filter(([, q]) => q > 0)
        .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
      if (items.length === 0) {
        throw new Error("En az bir ürün için iade miktarı girin");
      }
      for (const line of items) {
        const item = sale.items.find((i) => i.id === line.saleItemId);
        if (!item) throw new Error("Kalem bulunamadı");
        if (line.quantity > (item.returnableQuantity ?? 0)) {
          throw new Error(`${item.productName}: aşırı iade`);
        }
      }
      const key =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `ret-${Date.now()}-${Math.random()}`;
      return posAdminService.createReturn(sale.id, { items }, key);
    },
    onSuccess: async (res) => {
      setReturnSuccess(`İade tamamlandı · ${money(res.totalAmount)}`);
      setReturnOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-pos-sale", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-pos-sales"] });
    },
    onError: (err: Error) => {
      setReturnError(
        err instanceof ApiError
          ? err.message
          : err.message || "İade başarısız",
      );
    },
  });

  return (
    <ModulePage permission="pos.read">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <nav className="mb-1 text-xs text-slate-500">
              <Link href="/pos/sales" className="hover:underline">
                POS · Satışlar
              </Link>
              <span className="mx-1">/</span>
              <span>Detay</span>
            </nav>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              POS Satış Detayı
            </h1>
            {sale ? (
              <p className="font-mono text-sm text-slate-500">
                {sale.saleNumber}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canRefund ? (
              <button
                type="button"
                className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
                onClick={openReturn}
              >
                İade başlat
              </button>
            ) : null}
            <Link href="/pos/sales" className="text-sm text-[#1b6b8f] underline">
              ← Satışlar
            </Link>
          </div>
        </div>

        {returnSuccess ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {returnSuccess}
          </p>
        ) : null}

        {saleQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : saleQuery.error ? (
          <p className="text-sm text-red-600">
            Satış yüklenemedi veya erişim yok.
          </p>
        ) : !sale ? (
          <p className="text-sm text-slate-500">Satış bulunamadı.</p>
        ) : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Satış bilgileri
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Satış no</dt>
                  <dd className="font-mono text-sm">{sale.saleNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Tarih</dt>
                  <dd className="text-sm">{formatDt(sale.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Kasa</dt>
                  <dd className="text-sm">
                    {sale.register
                      ? `${sale.register.code} — ${sale.register.name}`
                      : sale.registerId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Kasiyer</dt>
                  <dd className="text-sm">
                    {sale.cashier ? personName(sale.cashier) : sale.userId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Müşteri</dt>
                  <dd className="text-sm">
                    {sale.customer
                      ? personName(sale.customer)
                      : "Perakende (misafir)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Toplam</dt>
                  <dd className="text-sm font-semibold">
                    {money(sale.grandTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Durum</dt>
                  <dd className="text-sm">{posSaleStatusLabel(sale.status)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Oluşturan / zaman</dt>
                  <dd className="text-sm">
                    {sale.cashier ? personName(sale.cashier) : "—"} ·{" "}
                    {formatDt(sale.createdAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Ürünler
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Ürün</th>
                    <th className="px-4 py-2 font-medium">SKU / Barkod</th>
                    <th className="px-4 py-2 font-medium">Adet</th>
                    <th className="px-4 py-2 font-medium">İade</th>
                    <th className="px-4 py-2 font-medium">Kalan</th>
                    <th className="px-4 py-2 font-medium">Birim</th>
                    <th className="px-4 py-2 font-medium">Satır</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {item.sku}
                        {item.barcode ? (
                          <div className="text-slate-500">{item.barcode}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        {item.returnedQuantity ?? 0}
                      </td>
                      <td className="px-4 py-2">
                        {item.returnableQuantity ?? item.quantity}
                      </td>
                      <td className="px-4 py-2">{money(item.unitPrice)}</td>
                      <td className="px-4 py-2 font-medium">
                        {money(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Ödemeler
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Yöntem</th>
                    <th className="px-4 py-2 font-medium">Tutar</th>
                    <th className="px-4 py-2 font-medium">Payment id</th>
                    <th className="px-4 py-2 font-medium">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.payments.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                        {posPaymentMethodLabel(p.method)}
                      </td>
                      <td className="px-4 py-2">{money(p.amount)}</td>
                      <td className="px-4 py-2 font-mono text-xs">{p.id}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {formatDt(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {sale.customerId ? (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Cari hareket
                </h2>
                {sale.account ? (
                  <p className="border-b border-slate-100 px-4 py-2 text-sm text-slate-600">
                    Güncel bakiye: {money(sale.account.balance)}{" "}
                    {sale.account.currency}
                    {sale.account.creditLimit
                      ? ` · Limit ${money(sale.account.creditLimit)}`
                      : null}
                  </p>
                ) : null}
                {sale.ledger.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    Bu satışa bağlı cari hareket bulunamadı.
                  </p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-medium">Tip</th>
                        <th className="px-4 py-2 font-medium">DEBIT</th>
                        <th className="px-4 py-2 font-medium">CREDIT</th>
                        <th className="px-4 py-2 font-medium">Reference</th>
                        <th className="px-4 py-2 font-medium">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.ledger.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-2">
                            {accountTxTypeLabel(row.type)}
                          </td>
                          <td className="px-4 py-2">
                            {row.debit ? money(row.debit) : "—"}
                          </td>
                          <td className="px-4 py-2">
                            {row.credit ? money(row.credit) : "—"}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {row.reference}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {formatDt(row.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ) : null}
          </>
        )}

        {returnOpen && sale ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-lg">
              <h3 className="text-lg font-semibold text-slate-900">İade</h3>
              <p className="mb-3 font-mono text-xs text-slate-500">
                {sale.saleNumber}
              </p>
              <table className="mb-3 min-w-full text-left text-sm">
                <thead className="text-slate-600">
                  <tr>
                    <th className="py-1 font-medium">Ürün</th>
                    <th className="py-1 font-medium">Satılan</th>
                    <th className="py-1 font-medium">İade edilen</th>
                    <th className="py-1 font-medium">İade</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 pr-2">{item.productName}</td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{item.returnedQuantity ?? 0}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          max={item.returnableQuantity ?? 0}
                          className="w-16 rounded border px-2 py-1"
                          value={qtyByItem[item.id] ?? 0}
                          disabled={(item.returnableQuantity ?? 0) <= 0}
                          onChange={(e) => {
                            const v = Math.max(
                              0,
                              Math.min(
                                item.returnableQuantity ?? 0,
                                Number(e.target.value) || 0,
                              ),
                            );
                            setQtyByItem((prev) => ({
                              ...prev,
                              [item.id]: v,
                            }));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mb-3 text-sm font-medium">
                Toplam iade (tahmini): {money(estimated.toFixed(2))}
              </p>
              {returnError ? (
                <p className="mb-2 text-sm text-red-600">{returnError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm"
                  disabled={returnMutation.isPending}
                  onClick={() => setReturnOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50"
                  disabled={returnMutation.isPending || estimated <= 0}
                  onClick={() => {
                    setReturnError(null);
                    returnMutation.mutate();
                  }}
                >
                  {returnMutation.isPending
                    ? "İade işleniyor…"
                    : "İadeyi onayla"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ModulePage>
  );
}
