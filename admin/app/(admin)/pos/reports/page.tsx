"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { StatCard } from "@/components/ui/stat-card";
import { apiDownloadText } from "@/lib/api-client";
import { posPaymentMethodLabel } from "@/lib/enum-labels";
import {
  posAdminService,
  type AdminPosReportSummary,
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
  const utc = Date.UTC(y!, m! - 1, d!) + deltaDays * 24 * 60 * 60 * 1000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

function money(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value} ₺`;
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

type Preset = "today" | "yesterday" | "7d" | "month" | "custom" | "x";

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const today = todayInIstanbul();
  if (preset === "today" || preset === "x") {
    return { from: today, to: shiftDate(today, 1) };
  }
  if (preset === "yesterday") {
    const y = shiftDate(today, -1);
    return { from: y, to: today };
  }
  if (preset === "7d") {
    return { from: shiftDate(today, -6), to: shiftDate(today, 1) };
  }
  // month: first day of month → tomorrow (exclusive end after today)
  const [y, m] = today.split("-");
  const monthStart = `${y}-${m}-01`;
  return { from: monthStart, to: shiftDate(today, 1) };
}

function SummaryBlocks({ data }: { data: AdminPosReportSummary }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Satış adedi" value={data.totalSales} />
        <StatCard label="Brüt ciro" value={money(data.grossSales)} />
        <StatCard label="İadeler" value={money(data.returns)} />
        <StatCard label="Net satış" value={money(data.netSales)} />
        <StatCard label="Ürün adedi" value={data.totalItems} />
        <StatCard label="Ort. sepet" value={money(data.averageBasket)} />
        <StatCard label="İade adedi" value={data.returnCount} />
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <h2 className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ödeme dağılımı
        </h2>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Yöntem</th>
              <th className="px-4 py-2 font-medium">Adet</th>
              <th className="px-4 py-2 font-medium">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {data.paymentBreakdown.map((row) => (
              <tr key={row.method} className="border-t">
                <td className="px-4 py-2">{posPaymentMethodLabel(row.method)}</td>
                <td className="px-4 py-2">{row.count}</td>
                <td className="px-4 py-2">{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-white">
          <h2 className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kasa
          </h2>
          {data.registerBreakdown.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Kayıt yok</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Kasa</th>
                  <th className="px-4 py-2 font-medium">Satış</th>
                  <th className="px-4 py-2 font-medium">Ciro</th>
                </tr>
              </thead>
              <tbody>
                {data.registerBreakdown.map((row) => (
                  <tr key={row.registerId} className="border-t">
                    <td className="px-4 py-2">
                      {row.registerCode} — {row.registerName}
                    </td>
                    <td className="px-4 py-2">{row.saleCount}</td>
                    <td className="px-4 py-2">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-white">
          <h2 className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kasiyer
          </h2>
          {data.cashierBreakdown.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Kayıt yok</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Kasiyer</th>
                  <th className="px-4 py-2 font-medium">Satış</th>
                  <th className="px-4 py-2 font-medium">Ciro</th>
                </tr>
              </thead>
              <tbody>
                {data.cashierBreakdown.map((row) => (
                  <tr key={row.cashierId} className="border-t">
                    <td className="px-4 py-2">{row.cashierName}</td>
                    <td className="px-4 py-2">{row.saleCount}</td>
                    <td className="px-4 py-2">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}

export default function PosReportsPage() {
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(todayInIstanbul());
  const [customToExclusive, setCustomToExclusive] = useState(
    shiftDate(todayInIstanbul(), 1),
  );
  const [registerId, setRegisterId] = useState("ALL");
  const [cashierId, setCashierId] = useState("ALL");

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customToExclusive };
    }
    return rangeForPreset(preset);
  }, [preset, customFrom, customToExclusive]);

  const filters = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      registerId: registerId !== "ALL" ? registerId : undefined,
      cashierId: cashierId !== "ALL" ? cashierId : undefined,
    }),
    [range, registerId, cashierId],
  );

  const registersQuery = useQuery({
    queryKey: ["admin-pos-registers"],
    queryFn: () => posAdminService.listRegisters(),
  });

  const cashiersQuery = useQuery({
    queryKey: ["admin-pos-cashiers"],
    queryFn: () => posAdminService.listCashiers(),
  });

  const summaryQuery = useQuery({
    queryKey: ["admin-pos-report", preset, filters],
    queryFn: () =>
      preset === "x"
        ? posAdminService.reportX({
            registerId: filters.registerId,
            cashierId: filters.cashierId,
          })
        : posAdminService.reportSummary(filters),
  });

  const presets: Array<{ id: Preset; label: string }> = [
    { id: "today", label: "Bugün" },
    { id: "yesterday", label: "Dün" },
    { id: "7d", label: "Son 7 gün" },
    { id: "month", label: "Bu ay" },
    { id: "custom", label: "Özel" },
    { id: "x", label: "X raporu" },
  ];

  return (
    <ModulePage permission="pos.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">POS</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Raporlar
            </h1>
            <p className="text-sm text-slate-600">
              Backend aggregation · Europe/Istanbul · from inclusive / to
              exclusive
            </p>
          </div>
          {preset !== "x" ? (
            <button
              type="button"
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => {
                void apiDownloadText(
                  posAdminService.reportCsvPath(filters),
                  `pos-report-${filters.from}_${filters.to}.csv`,
                ).catch(() => window.alert("CSV indirilemedi."));
              }}
            >
              CSV indir
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                preset === p.id
                  ? "bg-[#16324f] text-white"
                  : "border bg-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {preset === "custom" ? (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded border px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={customToExclusive}
                onChange={(e) => setCustomToExclusive(e.target.value)}
                className="rounded border px-2 py-1.5 text-sm"
                title="Bitiş (exclusive)"
              />
              <span className="self-center text-xs text-slate-500">
                Bitiş exclusive (dahil değil)
              </span>
            </>
          ) : (
            <p className="self-center text-sm text-slate-500">
              {range.from} → {range.to} (exclusive)
              {preset === "x" && summaryQuery.data?.generatedAt
                ? ` · ${new Date(summaryQuery.data.generatedAt).toLocaleString("tr-TR")}`
                : null}
            </p>
          )}
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
            value={cashierId}
            onChange={(e) => setCashierId(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="ALL">Kasiyer: Tümü</option>
            {(cashiersQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {summaryQuery.isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : summaryQuery.error ? (
          <p className="text-sm text-red-600">Rapor alınamadı.</p>
        ) : summaryQuery.data ? (
          <SummaryBlocks data={summaryQuery.data} />
        ) : null}

        <p className="text-xs text-slate-400">
          Z raporu (kasa kapanışı) bu fazda uygulanmadı — immutable closing
          modeli Phase 6+ için tasarlandı. X raporu state değiştirmez.
        </p>
      </div>
    </ModulePage>
  );
}
