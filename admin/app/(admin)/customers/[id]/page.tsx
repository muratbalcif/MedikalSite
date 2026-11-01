"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import {
  orderStatusLabel,
  userStatusLabel,
} from "@/lib/enum-labels";
import { usePermissions } from "@/hooks/use-permissions";
import {
  accountingService,
  customerPricingService,
  customersAdminService,
  paymentsService,
} from "@/services/admin-api.service";

const TABS = [
  "Genel",
  "Siparişler",
  "Adresler",
  "Özel Fiyatlar",
  "Cari Hesap",
  "Havale Bildirimleri",
  "Audit Log",
] as const;

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Genel");
  const [manual, setManual] = useState({
    direction: "DEBIT" as "DEBIT" | "CREDIT",
    amount: "",
    description: "",
  });

  const detail = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => customersAdminService.get(id),
  });

  const orders = useQuery({
    queryKey: ["admin-customer-orders", id],
    queryFn: () => customersAdminService.orders(id),
    enabled: tab === "Siparişler",
  });

  const prices = useQuery({
    queryKey: ["admin-customer-prices", id],
    queryFn: () => customerPricingService.list(id),
    enabled: tab === "Özel Fiyatlar",
  });

  const statement = useQuery({
    queryKey: ["admin-customer-statement", id],
    queryFn: () => accountingService.statement(id),
    enabled: tab === "Cari Hesap",
  });

  const transfers = useQuery({
    queryKey: ["admin-customer-transfers", id],
    queryFn: () => paymentsService.listBankTransfers(1, 50),
    enabled: tab === "Havale Bildirimleri",
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => customersAdminService.updateStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-customer", id] }),
  });

  const manualMutation = useMutation({
    mutationFn: () =>
      accountingService.createManual({
        customerId: id,
        direction: manual.direction,
        amount: manual.amount,
        description: manual.description,
      }),
    onSuccess: () => {
      setManual({ direction: "DEBIT", amount: "", description: "" });
      void qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      void qc.invalidateQueries({ queryKey: ["admin-customer-statement", id] });
    },
  });

  const c = detail.data;

  return (
    <ModulePage permission="customer.read">
      <div className="space-y-4">
        {detail.isLoading || !c ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                    {c.firstName} {c.lastName}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {c.corporate?.companyName ?? c.email} · {userStatusLabel(c.status)} · Bakiye{" "}
                    <strong>{c.account.balance}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {can("order.read") ? (
                    <Link
                      href="/orders"
                      className="rounded-md border bg-white px-3 py-1.5 text-sm"
                    >
                      Siparişler
                    </Link>
                  ) : null}
                  {can("pricing.create") ? (
                    <button
                      type="button"
                      onClick={() => setTab("Özel Fiyatlar")}
                      className="rounded-md border bg-white px-3 py-1.5 text-sm"
                    >
                      Özel Fiyat
                    </button>
                  ) : null}
                  {can("accounting.create") ? (
                    <button
                      type="button"
                      onClick={() => setTab("Cari Hesap")}
                      className="rounded-md border bg-white px-3 py-1.5 text-sm"
                    >
                      Cari Hareket
                    </button>
                  ) : null}
                  {can("customer.update") ? (
                    <button
                      type="button"
                      onClick={() =>
                        statusMutation.mutate(
                          c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        )
                      }
                      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm"
                    >
                      {c.status === "ACTIVE" ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
                <div className="rounded-md bg-white/80 p-3">
                  Borç: {c.account.totalDebit}
                </div>
                <div className="rounded-md bg-white/80 p-3">
                  Alacak: {c.account.totalCredit}
                </div>
                <div className="rounded-md bg-white/80 p-3">
                  Vadesi geçen: {c.account.overdueAmount ?? "0.00"}
                </div>
                <div className="rounded-md bg-white/80 p-3">
                  Limit: {c.account.creditLimit ?? "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    tab === t
                      ? "bg-[#16324f] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "Genel" && (
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl border bg-white p-4 text-sm">
                <p>Ad: {c.firstName}</p>
                <p>Soyad: {c.lastName}</p>
                <p>E-posta: {c.email}</p>
                <p>Telefon: {c.phone ?? "—"}</p>
                <p>Tip: {c.userType}</p>
                <p>Durum: {userStatusLabel(c.status)}</p>
                {c.corporate && (
                  <>
                    <p>Firma: {c.corporate.companyName}</p>
                    <p>Vergi no: {c.corporate.taxNumber}</p>
                    <p>Vergi dairesi: {c.corporate.taxOffice}</p>
                    <p>
                      Cari satış: {c.corporate.allowCredit ? "Evet" : "Hayır"} ·
                      Vade: {c.corporate.paymentTermDays} gün
                    </p>
                  </>
                )}
                <p>
                  Sipariş özeti: {c.ordersSummary.orderCount} /{" "}
                  {c.ordersSummary.totalAmount} (ödenen{" "}
                  {c.ordersSummary.paidAmount}, bekleyen{" "}
                  {c.ordersSummary.pendingAmount})
                </p>
              </div>
            )}

            {tab === "Siparişler" && (
              <OrdersTab data={orders.data as never} loading={orders.isLoading} />
            )}

            {tab === "Adresler" && (
              <ul className="space-y-2">
                {c.addresses.map((a) => (
                  <li
                    key={String(a.id)}
                    className="rounded-lg border bg-white p-3 text-sm"
                  >
                    {String(a.title ?? a.city ?? a.id)}
                  </li>
                ))}
                {c.addresses.length === 0 && (
                  <p className="text-sm text-slate-500">Adres yok.</p>
                )}
              </ul>
            )}

            {tab === "Özel Fiyatlar" && (
              <div className="rounded-xl border bg-white overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Ürün</th>
                      <th className="px-3 py-2 text-left">Fiyat</th>
                      <th className="px-3 py-2 text-left">Aktif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(prices.data ?? []).map((p: {
                      id: string;
                      productId: string;
                      price: string;
                      active: boolean;
                    }) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{p.productId}</td>
                        <td className="px-3 py-2">{p.price}</td>
                        <td className="px-3 py-2">
                          {p.active ? "Evet" : "Hayır"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t px-3 py-2 text-xs text-slate-500">
                  Ekleme/düzenleme için Fiyatlandırma modülünü kullanın. Audit:
                  CUSTOMER_PRICE_*.
                </p>
              </div>
            )}

            {tab === "Cari Hesap" && (
              <div className="space-y-4">
                {can("accounting.create") && (
                  <form
                    className="flex flex-wrap gap-2 rounded-xl border bg-white p-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      manualMutation.mutate();
                    }}
                  >
                    <select
                      value={manual.direction}
                      onChange={(e) =>
                        setManual((m) => ({
                          ...m,
                          direction: e.target.value as "DEBIT" | "CREDIT",
                        }))
                      }
                      className="rounded border px-2 py-1.5 text-sm"
                    >
                      <option value="DEBIT">Borç</option>
                      <option value="CREDIT">Alacak</option>
                    </select>
                    <input
                      required
                      value={manual.amount}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, amount: e.target.value }))
                      }
                      placeholder="Tutar"
                      className="rounded border px-2 py-1.5 text-sm"
                    />
                    <input
                      required
                      value={manual.description}
                      onChange={(e) =>
                        setManual((m) => ({
                          ...m,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Açıklama"
                      className="min-w-[200px] flex-1 rounded border px-2 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded bg-[#16324f] px-3 py-1.5 text-sm text-white"
                    >
                      Kaydet
                    </button>
                  </form>
                )}
                <div className="overflow-hidden rounded-xl border bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Tarih</th>
                        <th className="px-3 py-2 text-left">Açıklama</th>
                        <th className="px-3 py-2 text-left">Borç</th>
                        <th className="px-3 py-2 text-left">Alacak</th>
                        <th className="px-3 py-2 text-left">Bakiye</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(statement.data?.items ?? []).map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="px-3 py-2">
                            {new Date(row.createdAt).toLocaleString("tr-TR")}
                          </td>
                          <td className="px-3 py-2">{row.description}</td>
                          <td className="px-3 py-2">{row.debit ?? ""}</td>
                          <td className="px-3 py-2">{row.credit ?? ""}</td>
                          <td className="px-3 py-2">{row.balanceAfter ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "Havale Bildirimleri" && (
              <div className="rounded-xl border bg-white p-3 text-sm">
                {transfers.isLoading
                  ? "Yükleniyor…"
                  : `${(transfers.data as { meta?: { total: number } })?.meta?.total ?? 0} bildirim`}
              </div>
            )}

            {tab === "Audit Log" && (
              <p className="text-sm text-slate-500">
                Audit kayıtları{" "}
                <Link href="/audit" className="text-[#16324f] underline">
                  Audit Logs
                </Link>{" "}
                sayfasından entityId={id} ile filtrelenebilir.
              </p>
            )}
          </>
        )}
      </div>
    </ModulePage>
  );
}

function OrdersTab({
  data,
  loading,
}: {
  data?: {
    items: Array<{
      id: string;
      orderNumber: string;
      createdAt: string;
      totalAmount: string;
      status: string;
      paymentStatus: string | null;
    }>;
    aggregates?: {
      orderCount: number;
      totalAmount: string;
      paidAmount: string;
      pendingAmount: string;
    };
  };
  loading: boolean;
}) {
  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  return (
    <div className="space-y-3">
      {data?.aggregates && (
        <div className="grid gap-2 sm:grid-cols-4 text-sm">
          <div className="rounded border bg-white p-3">
            Sipariş: {data.aggregates.orderCount}
          </div>
          <div className="rounded border bg-white p-3">
            Toplam: {data.aggregates.totalAmount}
          </div>
          <div className="rounded border bg-white p-3">
            Ödenen: {data.aggregates.paidAmount}
          </div>
          <div className="rounded border bg-white p-3">
            Bekleyen: {data.aggregates.pendingAmount}
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Tutar</th>
              <th className="px-3 py-2 text-left">Ödeme</th>
              <th className="px-3 py-2 text-left">Durum</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-[#16324f] hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {new Date(o.createdAt).toLocaleString("tr-TR")}
                </td>
                <td className="px-3 py-2">{o.totalAmount}</td>
                <td className="px-3 py-2">{o.paymentStatus ?? "—"}</td>
                <td className="px-3 py-2">{orderStatusLabel(o.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
