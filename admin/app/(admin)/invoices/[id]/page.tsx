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
  invoiceStatusLabel,
} from "@/lib/enum-labels";
import { invoicesService } from "@/services/admin-api.service";

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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ml-2 text-xs text-[#1b6b8f] underline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showTech, setShowTech] = useState(false);
  const [docBusy, setDocBusy] = useState<string | null>(null);

  const invoiceQuery = useQuery({
    queryKey: ["admin-invoice", id],
    queryFn: () => invoicesService.getById(id),
  });

  const formalizeMutation = useMutation({
    mutationFn: () => invoicesService.formalize(id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-invoice", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err.message || "Resmileştirme başarısız",
      );
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => invoicesService.sync(id),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-invoice", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err.message || "Durum yenileme başarısız",
      );
    },
  });

  async function runDocAction(
    key: string,
    action: () => Promise<void>,
  ): Promise<void> {
    setDocBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Belge işlemi başarısız",
      );
    } finally {
      setDocBusy(null);
    }
  }

  const retryCreateMutation = useMutation({
    mutationFn: () => {
      const saleId = invoiceQuery.data?.saleId;
      if (!saleId) throw new Error("saleId missing");
      return invoicesService.createFromSale(saleId, {
        billingAddressId: invoiceQuery.data?.billingAddressId ?? undefined,
      });
    },
    onSuccess: async (res) => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      if (res.invoiceId && res.invoiceId !== id) {
        router.push(`/invoices/${res.invoiceId}`);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["admin-invoice", id] });
      }
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err.message || "Yeniden deneme başarısız",
      );
    },
  });

  const inv = invoiceQuery.data;
  const snap = inv?.billingAddressSnapshot;

  return (
    <ModulePage permission="invoice.read">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Fatura Detayı
            </h1>
            {inv ? (
              <p className="font-mono text-sm text-slate-500">
                {inv.invoiceNumber ?? inv.id}
              </p>
            ) : null}
          </div>
          <Link href="/invoices" className="text-sm text-[#1b6b8f] underline">
            ← Faturalar
          </Link>
        </div>

        {invoiceQuery.isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : !inv ? (
          <p className="text-sm text-red-700">Fatura bulunamadı.</p>
        ) : (
          <>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-500">Durum</p>
                <p className="font-medium">
                  {invoiceDisplayStatusLabel(inv.displayStatus)}
                  <span className="ml-2 text-xs text-slate-400">
                    ({invoiceStatusLabel(inv.status)})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-slate-500">Belge tipi</p>
                <p>{invoiceDocumentTypeLabel(inv.documentType)}</p>
              </div>
              <div>
                <p className="text-slate-500">Provider</p>
                <p className="font-mono">{inv.provider}</p>
              </div>
              <div>
                <p className="text-slate-500">Satış</p>
                <Link
                  href={`/sales/${inv.saleId}`}
                  className="font-mono text-[#1b6b8f] underline"
                >
                  {inv.saleNumber}
                </Link>
              </div>
              <div>
                <p className="text-slate-500">Müşteri</p>
                <p className="font-medium">{inv.customerLabel}</p>
                {inv.customer ? (
                  <Link
                    href={`/customers/${inv.customerId}`}
                    className="text-xs text-[#1b6b8f] underline"
                  >
                    Müşteri kartı
                  </Link>
                ) : null}
              </div>
              <div>
                <p className="text-slate-500">Oluşturan</p>
                <p>{personName(inv.createdBy)}</p>
              </div>
              <div>
                <p className="text-slate-500">KolayBi document_id</p>
                <p className="font-mono text-xs">
                  {inv.externalDocumentId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">UUID / ETTN</p>
                <p className="break-all font-mono text-xs">
                  {inv.uuid ?? "—"}
                  {inv.uuid ? <CopyButton value={inv.uuid} /> : null}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Oluşturulma</p>
                <p>{new Date(inv.createdAt).toLocaleString("tr-TR")}</p>
              </div>
              <div>
                <p className="text-slate-500">Issued</p>
                <p>
                  {inv.issuedAt
                    ? new Date(inv.issuedAt).toLocaleString("tr-TR")
                    : "—"}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-1 text-sm">
              <h2 className="mb-2 font-semibold text-slate-900">Tutarlar</h2>
              <div className="flex justify-between">
                <span>Ara toplam</span>
                <span className="tabular-nums">{money(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>İndirim</span>
                <span className="tabular-nums">{money(inv.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>KDV</span>
                <span className="tabular-nums">{money(inv.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Toplam</span>
                <span className="tabular-nums">{money(inv.totalAmount)}</span>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm space-y-1">
              <h2 className="mb-2 font-semibold text-slate-900">
                Fatura adresi (snapshot)
              </h2>
              <p className="text-xs text-slate-500">
                Fatura anındaki kopya — sonraki adres değişiklikleri bunu
                değiştirmez.
              </p>
              {snap ? (
                <>
                  <p>
                    {[snap.firstName, snap.lastName].filter(Boolean).join(" ")}
                    {snap.companyName ? ` / ${snap.companyName}` : ""}
                  </p>
                  <p>{snap.phone}</p>
                  <p>
                    {[snap.neighborhood, snap.addressLine]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  <p>
                    {[snap.district, snap.city, snap.postalCode]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                  <p>{snap.country}</p>
                </>
              ) : (
                <p>—</p>
              )}
            </section>

            {inv.errorCode || inv.errorMessage ? (
              <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm space-y-2">
                <h2 className="font-semibold text-red-900">Hata</h2>
                <p className="text-red-800">
                  {inv.errorCode ?? "Bilinmeyen hata"}
                </p>
                {inv.errorMessage ? (
                  <>
                    <button
                      type="button"
                      className="text-xs text-red-700 underline"
                      onClick={() => setShowTech((v) => !v)}
                    >
                      {showTech
                        ? "Teknik detayı gizle"
                        : "Teknik detayı göster"}
                    </button>
                    {showTech ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-white/80 p-2 text-xs text-red-900">
                        {inv.errorMessage}
                      </pre>
                    ) : null}
                  </>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm">
              <h2 className="font-semibold text-slate-900">Belge</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-slate-500">Durum</p>
                  <p>{invoiceDisplayStatusLabel(inv.displayStatus)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Fatura No</p>
                  <p className="font-mono">{inv.invoiceNumber ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">UUID / ETTN</p>
                  <p className="break-all font-mono text-xs">
                    {inv.uuid ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Provider / Document ID</p>
                  <p className="font-mono text-xs">
                    {inv.provider} · {inv.externalDocumentId ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {inv.canDownloadPdf ? (
                  <>
                    <button
                      type="button"
                      disabled={docBusy === "view-pdf"}
                      onClick={() =>
                        runDocAction("view-pdf", () =>
                          invoicesService.downloadPdf(
                            id,
                            `invoice-${inv.invoiceNumber ?? id}.pdf`,
                            true,
                          ),
                        )
                      }
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      {docBusy === "view-pdf" ? "Açılıyor…" : "PDF Görüntüle"}
                    </button>
                    <button
                      type="button"
                      disabled={docBusy === "dl-pdf"}
                      onClick={() =>
                        runDocAction("dl-pdf", () =>
                          invoicesService.downloadPdf(
                            id,
                            `invoice-${inv.invoiceNumber ?? id}.pdf`,
                            false,
                          ),
                        )
                      }
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      {docBusy === "dl-pdf" ? "İndiriliyor…" : "PDF İndir"}
                    </button>
                  </>
                ) : null}
                {inv.canDownloadXml ? (
                  <button
                    type="button"
                    disabled={docBusy === "dl-xml"}
                    onClick={() =>
                      runDocAction("dl-xml", () =>
                        invoicesService.downloadXml(
                          id,
                          `invoice-${inv.invoiceNumber ?? id}.xml`,
                        ),
                      )
                    }
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                  >
                    {docBusy === "dl-xml" ? "İndiriliyor…" : "XML İndir"}
                  </button>
                ) : null}
                {inv.canSync ? (
                  <button
                    type="button"
                    disabled={syncMutation.isPending}
                    onClick={() => syncMutation.mutate()}
                    className="rounded-md border border-[#d9e8ef] bg-[#f0f5f8] px-3 py-1.5 text-sm text-[#16324f] hover:bg-[#d9e8ef] disabled:opacity-60"
                  >
                    {syncMutation.isPending
                      ? "Yenileniyor…"
                      : "Durumu Yenile"}
                  </button>
                ) : null}
              </div>
              {!inv.canDownloadPdf && !inv.canSync ? (
                <p className="text-xs text-slate-500">
                  Belge aksiyonları için önce taslak oluşturup resmileştirin.
                </p>
              ) : null}
            </section>

            {can("invoice.create") && inv.canFormalize ? (
              <section className="rounded-xl border border-[#d9e8ef] bg-[#f0f5f8] p-5 space-y-3">
                <h2 className="font-semibold text-[#16324f]">
                  Faturayı resmileştir
                </h2>
                <p className="text-sm text-[#16324f]">
                  KolayBi taslak faturayı e-Fatura / e-Arşiv olarak GİB’e
                  gönderir. Senaryoyu KolayBi cari kaydına göre seçer.
                </p>
                <button
                  type="button"
                  disabled={formalizeMutation.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Bu faturayı resmileştirmek istediğinize emin misiniz?",
                      )
                    ) {
                      return;
                    }
                    formalizeMutation.mutate();
                  }}
                  className="rounded-md bg-[#1b6b8f] px-4 py-2 text-sm font-medium text-white hover:bg-[#16324f] disabled:opacity-60"
                >
                  {formalizeMutation.isPending
                    ? "Gönderiliyor…"
                    : inv.canRetry
                      ? "Yeniden dene (resmileştir)"
                      : "Faturayı Resmileştir"}
                </button>
              </section>
            ) : null}

            {can("invoice.create") &&
            inv.canRetry &&
            inv.status === "FAILED" &&
            !inv.canFormalize ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                <h2 className="font-semibold text-amber-950">
                  Oluşturmayı yeniden dene
                </h2>
                <p className="text-sm text-amber-900">
                  Geçici provider hatası sonrası aynı satış için fatura
                  oluşturmayı tekrar dener.
                </p>
                <button
                  type="button"
                  disabled={retryCreateMutation.isPending}
                  onClick={() => retryCreateMutation.mutate()}
                  className="rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  {retryCreateMutation.isPending
                    ? "Deneniyor…"
                    : "Yeniden dene"}
                </button>
              </section>
            ) : null}

            <button
              type="button"
              className="text-sm text-slate-500 underline"
              onClick={() => router.push("/invoices")}
            >
              Listeye dön
            </button>
          </>
        )}
      </div>
    </ModulePage>
  );
}
