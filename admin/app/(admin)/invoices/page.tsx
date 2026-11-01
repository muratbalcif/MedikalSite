"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import {
  invoiceDisplayStatusLabel,
  invoiceDocumentTypeLabel,
} from "@/lib/enum-labels";
import {
  invoicesService,
  type InvoiceDisplayStatus,
  type InvoiceDocumentType,
  type InvoiceStatus,
} from "@/services/admin-api.service";

const DISPLAY_FILTERS = [
  "ALL",
  "DRAFT",
  "FORMALIZED",
  "PENDING",
  "FAILED",
  "CANCELLED",
] as const;

function money(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value} ₺`;
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function truncateId(value: string | null, len = 10): string {
  if (!value) return "—";
  if (value.length <= len) return value;
  return `${value.slice(0, len)}…`;
}

function displayToApiStatus(
  display: (typeof DISPLAY_FILTERS)[number],
): { status?: InvoiceStatus; preferFormalized?: boolean; preferDraft?: boolean } {
  if (display === "ALL") return {};
  if (display === "PENDING") return { status: "PENDING" };
  if (display === "FAILED") return { status: "FAILED" };
  if (display === "CANCELLED") return { status: "CANCELLED" };
  if (display === "DRAFT") return { status: "SUCCESS", preferDraft: true };
  if (display === "FORMALIZED") {
    return { status: "SUCCESS", preferFormalized: true };
  }
  return {};
}

function badgeClass(display: InvoiceDisplayStatus): string {
  switch (display) {
    case "FORMALIZED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "DRAFT":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "PENDING":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "FAILED":
      return "bg-red-50 text-red-800 border-red-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [displayFilter, setDisplayFilter] =
    useState<(typeof DISPLAY_FILTERS)[number]>("ALL");
  const [documentType, setDocumentType] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const listQuery = useQuery({
    queryKey: [
      "admin-invoices",
      search,
      displayFilter,
      documentType,
      dateFrom,
      dateTo,
    ],
    queryFn: () => {
      const apiFilter = displayToApiStatus(displayFilter);
      return invoicesService.list(1, 50, {
        status: apiFilter.status,
        formalized: apiFilter.preferFormalized
          ? true
          : apiFilter.preferDraft
            ? false
            : undefined,
        documentType:
          documentType === "ALL"
            ? undefined
            : (documentType as InvoiceDocumentType),
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    },
  });

  const items = listQuery.data?.items ?? [];

  return (
    <ModulePage permission="invoice.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Faturalar
            </h1>
            <p className="text-sm text-slate-600">
              Satış faturalarını listeleyin, taslak / resmileştirilmiş durumu
              görün.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Fatura / satış / müşteri / UUID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={displayFilter}
              onChange={(e) =>
                setDisplayFilter(
                  e.target.value as (typeof DISPLAY_FILTERS)[number],
                )
              }
            >
              {DISPLAY_FILTERS.map((v) => (
                <option key={v} value={v}>
                  {v === "ALL" ? "Tüm durumlar" : invoiceDisplayStatusLabel(v)}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="ALL">Belge tipi</option>
              <option value="E_ARCHIVE">e-Arşiv</option>
              <option value="E_INVOICE">e-Fatura</option>
            </select>
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {listQuery.isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : listQuery.isError ? (
          <p className="text-sm text-red-700">Faturalar yüklenemedi.</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Kayıt bulunamadı.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Fatura No</th>
                  <th className="px-4 py-3 font-medium">Satış No</th>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Belge</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">UUID</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Tutar</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {inv.invoiceNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/sales/${inv.saleId}`}
                        className="text-[#1b6b8f] underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.saleNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.customerLabel}</td>
                    <td className="px-4 py-3">
                      {invoiceDocumentTypeLabel(inv.documentType)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(inv.displayStatus)}`}
                      >
                        {invoiceDisplayStatusLabel(inv.displayStatus)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-500"
                      title={inv.uuid ?? undefined}
                    >
                      {truncateId(inv.uuid)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {inv.provider}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {money(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(inv.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-[#1b6b8f] underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
