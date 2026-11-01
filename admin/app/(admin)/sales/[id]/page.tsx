"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import {
  invoiceDisplayStatusLabel,
  invoiceDocumentTypeLabel,
  salePaymentMethodLabel,
  saleStatusLabel,
} from "@/lib/enum-labels";
import {
  customersAdminService,
  invoicesService,
  salesService,
} from "@/services/admin-api.service";

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

function addressLabel(a: Record<string, unknown>): string {
  const parts = [
    a.title,
    a.city,
    a.district,
    a.addressLine,
  ].filter((v) => typeof v === "string" && v.trim());
  return parts.length > 0 ? parts.join(" · ") : String(a.id ?? "Adres");
}

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [billingAddressId, setBillingAddressId] = useState("");
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);

  const saleQuery = useQuery({
    queryKey: ["admin-sale", id],
    queryFn: () => salesService.getById(id),
  });

  const invoicesQuery = useQuery({
    queryKey: ["admin-sale-invoices", id],
    queryFn: () => invoicesService.list(1, 20, { saleId: id }),
    enabled: can("invoice.read"),
  });

  const customerAddressesQuery = useQuery({
    queryKey: ["admin-customer-addresses", saleQuery.data?.customerId],
    queryFn: () => customersAdminService.get(saleQuery.data!.customerId!),
    enabled: Boolean(
      showCreateInvoice && saleQuery.data?.customerId && can("invoice.create"),
    ),
  });

  const cancelMutation = useMutation({
    mutationFn: () => salesService.cancel(id, cancelReason.trim() || undefined),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-sale", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err.message || "İptal başarısız",
      );
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      invoicesService.createFromSale(id, {
        billingAddressId: billingAddressId || undefined,
      }),
    onSuccess: async (res) => {
      setError(null);
      setShowCreateInvoice(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin-sale-invoices", id],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      if (res.invoiceId) {
        router.push(`/invoices/${res.invoiceId}`);
      }
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err.message || "Fatura oluşturulamadı",
      );
    },
  });

  const sale = saleQuery.data;
  const invoices = invoicesQuery.data?.items ?? [];
  const addresses =
    (customerAddressesQuery.data?.addresses as Array<Record<string, unknown>>) ??
    [];
  const canCreateInvoice =
    Boolean(sale?.customerId) &&
    sale?.status === "COMPLETED" &&
    !invoicesQuery.isLoading &&
    invoices.length === 0 &&
    can("invoice.create");

  return (
    <ModulePage permission="sale.read">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Satış Detayı
            </h1>
            {sale ? (
              <p className="font-mono text-sm text-slate-500">
                {sale.saleNumber}
              </p>
            ) : null}
          </div>
          <Link href="/sales" className="text-sm text-[#1b6b8f] underline">
            ← Satışlar
          </Link>
        </div>

        {saleQuery.isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : !sale ? (
          <p className="text-sm text-red-700">Satış bulunamadı.</p>
        ) : (
          <>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-500">Satış No</p>
                <p className="font-mono font-medium">{sale.saleNumber}</p>
              </div>
              <div>
                <p className="text-slate-500">Tarih / Saat</p>
                <p>
                  {new Date(sale.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Müşteri</p>
                <p className="font-medium">{sale.customerLabel}</p>
              </div>
              <div>
                <p className="text-slate-500">Satış Yapan</p>
                <p className="font-medium">{personName(sale.createdBy)}</p>
              </div>
              <div>
                <p className="text-slate-500">Ödeme Yöntemi</p>
                <p>{salePaymentMethodLabel(sale.paymentMethod)}</p>
              </div>
              <div>
                <p className="text-slate-500">Durum</p>
                <p>{saleStatusLabel(sale.status)}</p>
              </div>
              {sale.note ? (
                <div className="sm:col-span-2">
                  <p className="text-slate-500">Not</p>
                  <p>{sale.note}</p>
                </div>
              ) : null}
              {sale.cancelReason ? (
                <div className="sm:col-span-2">
                  <p className="text-slate-500">İptal nedeni</p>
                  <p>{sale.cancelReason}</p>
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ürün</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Adet</th>
                    <th className="px-4 py-3 font-medium">Birim</th>
                    <th className="px-4 py-3 font-medium">İndirim</th>
                    <th className="px-4 py-3 font-medium">KDV</th>
                    <th className="px-4 py-3 font-medium">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {money(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {money(item.discountAmount)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {money(item.taxAmount)}
                        <span className="ml-1 text-xs text-slate-400">
                          (%{item.taxRate})
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {money(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Ara Toplam</span>
                <span className="tabular-nums">{money(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>İndirim</span>
                <span className="tabular-nums">
                  {money(sale.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Vergi</span>
                <span className="tabular-nums">{money(sale.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Genel Toplam</span>
                <span className="tabular-nums">{money(sale.totalAmount)}</span>
              </div>
            </section>

            {can("invoice.read") ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">Fatura</h2>
                  {canCreateInvoice && !showCreateInvoice ? (
                    <button
                      type="button"
                      className="rounded-md bg-[#1b6b8f] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#16324f]"
                      onClick={() => {
                        setShowCreateInvoice(true);
                        setBillingAddressId("");
                      }}
                    >
                      Fatura Oluştur
                    </button>
                  ) : null}
                </div>

                {!sale.customerId ? (
                  <p className="text-slate-500">
                    Perakende satışlarda (müşterisiz) fatura oluşturulamaz.
                  </p>
                ) : invoicesQuery.isLoading ? (
                  <p className="text-slate-500">Faturalar yükleniyor…</p>
                ) : invoices.length > 0 ? (
                  <ul className="space-y-2">
                    {invoices.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
                      >
                        <div>
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-mono text-[#1b6b8f] underline"
                          >
                            {inv.invoiceNumber ?? inv.id.slice(0, 8)}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {invoiceDocumentTypeLabel(inv.documentType)} ·{" "}
                            {invoiceDisplayStatusLabel(inv.displayStatus)}
                          </p>
                        </div>
                        <span className="tabular-nums text-slate-700">
                          {money(inv.totalAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : sale.status !== "COMPLETED" ? (
                  <p className="text-slate-500">
                    Fatura yalnızca tamamlanmış satışlar için oluşturulabilir.
                  </p>
                ) : (
                  <p className="text-slate-500">Henüz fatura yok.</p>
                )}

                {showCreateInvoice && canCreateInvoice ? (
                  <div className="space-y-3 rounded-lg border border-[#d9e8ef] bg-[#f0f5f8] p-4">
                    <p className="text-[#16324f]">
                      KolayBi taslak fatura oluşturulur. Belge tipi (e-Fatura /
                      e-Arşiv) müşteri kaydına göre backend tarafından seçilir.
                    </p>
                    {customerAddressesQuery.isLoading ? (
                      <p className="text-xs text-[#16324f]">Adresler yükleniyor…</p>
                    ) : addresses.length > 1 ? (
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-[#16324f]">
                          Fatura adresi
                        </span>
                        <select
                          className="w-full rounded-md border border-[#d9e8ef] bg-white px-3 py-2 text-sm"
                          value={billingAddressId}
                          onChange={(e) => setBillingAddressId(e.target.value)}
                        >
                          <option value="">Seçin…</option>
                          {addresses.map((a) => (
                            <option key={String(a.id)} value={String(a.id)}>
                              {addressLabel(a)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : addresses.length === 1 ? (
                      <p className="text-xs text-[#16324f]">
                        Adres: {addressLabel(addresses[0]!)}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-800">
                        Müşterinin kayıtlı adresi yok. Önce müşteri kartına adres
                        ekleyin.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          createInvoiceMutation.isPending ||
                          addresses.length === 0 ||
                          (addresses.length > 1 && !billingAddressId)
                        }
                        onClick={() => createInvoiceMutation.mutate()}
                        className="rounded-md bg-[#1b6b8f] px-4 py-2 text-sm font-medium text-white hover:bg-[#16324f] disabled:opacity-60"
                      >
                        {createInvoiceMutation.isPending
                          ? "Oluşturuluyor…"
                          : "Onayla ve oluştur"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[#d9e8ef] bg-white px-4 py-2 text-sm text-[#16324f]"
                        onClick={() => setShowCreateInvoice(false)}
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {sale.status === "COMPLETED" && can("sale.update") ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                <h2 className="font-semibold text-amber-900">Satışı iptal et</h2>
                <p className="text-sm text-amber-800">
                  İptal stoku geri ekler. Bu işlem geri alınamaz.
                </p>
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="İptal nedeni (opsiyonel)"
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Bu satışı iptal etmek istediğinize emin misiniz?",
                      )
                    ) {
                      return;
                    }
                    cancelMutation.mutate();
                  }}
                  className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  {cancelMutation.isPending ? "İptal ediliyor…" : "İptal Et"}
                </button>
              </section>
            ) : null}

            <button
              type="button"
              className="text-sm text-slate-500 underline"
              onClick={() => router.push("/sales")}
            >
              Listeye dön
            </button>
          </>
        )}
      </div>
    </ModulePage>
  );
}
