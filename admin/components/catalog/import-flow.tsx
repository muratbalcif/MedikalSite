"use client";

import { importJobStatusLabel } from "@/lib/enum-labels";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStorage } from "@/lib/auth-storage";
import {
  importsService,
  type AdminImportJob,
} from "@/services/admin-api.service";

type ImportKind = "products" | "prices" | "stock";

const SAMPLE_BY_KIND: Record<
  ImportKind,
  { href: string; label: string; columns: string }
> = {
  products: {
    href: "/samples/ornek-urun-aktarimi.xlsx",
    label: "Örnek ürün Excel indir",
    columns:
      "sku, name, brand, category, vatRate, retailPrice, campaignPrice, wholesalePrice, corporatePrice, stock, minimumStock, active, slug, barcode, description",
  },
  prices: {
    href: "/samples/ornek-fiyat-guncelleme.xlsx",
    label: "Örnek fiyat Excel indir",
    columns:
      "sku, priceType (RETAIL=Perakende | CAMPAIGN=Kampanya | WHOLESALE=Toptan | CORPORATE=Kurumsal), price, validFrom, validTo",
  },
  stock: {
    href: "/samples/ornek-stok-guncelleme.xlsx",
    label: "Örnek stok Excel indir",
    columns: "sku, quantity, operation (SET|INCREASE|DECREASE), reason",
  },
};

export function ImportFlow({
  kind,
  title,
  previewFn,
}: {
  kind: ImportKind;
  title: string;
  previewFn: (file: File) => Promise<AdminImportJob>;
}) {
  const queryClient = useQueryClient();
  const [job, setJob] = useState<AdminImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sample = SAMPLE_BY_KIND[kind];

  const previewMutation = useMutation({
    mutationFn: previewFn,
    onSuccess: (data) => {
      setJob(data);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => importsService.confirm(id, kind),
    onSuccess: (data) => {
      setJob(data);
      void queryClient.invalidateQueries({ queryKey: ["admin-imports"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const previewRows = (() => {
    if (!job?.preview) return [];
    if (Array.isArray(job.preview)) {
      return job.preview as Array<Record<string, unknown>>;
    }
    if (
      typeof job.preview === "object" &&
      job.preview !== null &&
      Array.isArray((job.preview as { rows?: unknown }).rows)
    ) {
      return (job.preview as { rows: Array<Record<string, unknown>> }).rows;
    }
    return [];
  })();

  const canImport = !!job && job.status === "READY" && job.validRows > 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <p className="mb-2 text-sm text-slate-600">
          Desteklenen formatlar: CSV, XLSX
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Beklenen kolonlar:{" "}
          <span className="font-mono">{sample.columns}</span>
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <a
            href={sample.href}
            download
            className="inline-flex min-h-11 items-center rounded-md border border-[#1b6b8f] bg-[#f0f5f8] px-4 py-2 text-sm font-medium text-[#16324f] hover:bg-[#d9e8ef]"
          >
            {sample.label}
          </a>
          <span className="text-xs text-slate-500">
            Örnek dosyayı indirip düzenleyerek yükleyebilirsiniz.
          </span>
        </div>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          aria-label="İçe aktarım dosyası seç"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) previewMutation.mutate(file);
          }}
        />
      </div>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {job && (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            <Stat label="Toplam" value={job.totalRows} />
            <Stat label="Geçerli" value={job.validRows} />
            <Stat label="Hatalı" value={job.invalidRows} />
            <Stat label="Yeni" value={job.newRows} />
            <Stat label="Güncelleme" value={job.updateRows} />
          </div>
          <p className="text-sm text-slate-600">
            Durum: <strong>{importJobStatusLabel(job.status)}</strong> — {job.filename}
          </p>
          {previewRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2">Row</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">
                        {String(row.rowNumber ?? idx + 1)}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {String(row.sku ?? "")}
                      </td>
                      <td className="px-2 py-1">{String(row.name ?? "")}</td>
                      <td className="px-2 py-1">
                        {Array.isArray(row.errors) && row.errors.length > 0
                          ? "Invalid"
                          : row.isUpdate
                            ? "Update"
                            : "New"}
                      </td>
                      <td className="px-2 py-1 text-red-700">
                        {Array.isArray(row.errors)
                          ? (row.errors as string[]).join("; ")
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canImport || confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(job.id)}
              className="rounded-md bg-[#16324f] px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {confirmMutation.isPending ? "İşleniyor…" : "Import Başlat"}
            </button>
            {(job.failedRows > 0 || job.invalidRows > 0) && (
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => {
                  const token = authStorage.getAccessToken();
                  void fetch(importsService.errorsCsvUrl(job.id), {
                    headers: token
                      ? { Authorization: `Bearer ${token}` }
                      : {},
                  })
                    .then((r) => r.text())
                    .then((text) => {
                      const blob = new Blob([text], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `import-errors-${job.id}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                }}
              >
                Hataları CSV indir
              </button>
            )}
          </div>
          {(job.status === "COMPLETED" || job.status === "PARTIAL") && (
            <p className="text-sm">
              Başarılı: <strong>{job.successRows}</strong> — Hatalı:{" "}
              <strong>{job.failedRows}</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
