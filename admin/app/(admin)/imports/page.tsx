"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { importJobStatusLabel, importJobTypeLabel } from "@/lib/enum-labels";
import { ModulePage } from "@/components/auth/module-page";
import { importsService } from "@/services/admin-api.service";

const IMPORT_CARDS = [
  {
    href: "/imports/products",
    title: "Toplu Ürün Aktarımı",
    sampleHref: "/samples/ornek-urun-aktarimi.xlsx",
    sampleLabel: "Örnek Excel",
  },
  {
    href: "/imports/prices",
    title: "Toplu Fiyat Güncelleme",
    sampleHref: "/samples/ornek-fiyat-guncelleme.xlsx",
    sampleLabel: "Örnek Excel",
  },
  {
    href: "/imports/stock",
    title: "Toplu Stok Güncelleme",
    sampleHref: "/samples/ornek-stok-guncelleme.xlsx",
    sampleLabel: "Örnek Excel",
  },
] as const;

export default function ImportsHubPage() {
  const history = useQuery({
    queryKey: ["admin-imports"],
    queryFn: () => importsService.list(1, 20),
  });

  return (
    <ModulePage permission={["import.read", "import.create"]}>
      <div className="space-y-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Toplu İşlemler
          </h2>
          <p className="text-sm text-slate-500">
            CSV / XLSX — önce preview, sonra confirm. Örnek Excel şablonlarını
            indirip düzenleyebilirsiniz.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {IMPORT_CARDS.map((card) => (
            <div
              key={card.href}
              className="rounded-xl border bg-white p-4 hover:border-[#d9e8ef]"
            >
              <Link href={card.href} className="font-medium text-slate-900">
                {card.title}
              </Link>
              <p className="mt-2">
                <a
                  href={card.sampleHref}
                  download
                  className="text-xs font-medium text-[#1b6b8f] underline"
                >
                  {card.sampleLabel} indir
                </a>
              </p>
            </div>
          ))}
        </div>

        <section className="space-y-2">
          <h3 className="font-semibold">Import geçmişi</h3>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Dosya</th>
                  <th className="px-3 py-2">Tip</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Başarı / Hata</th>
                  <th className="px-3 py-2">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {(history.data?.items ?? []).map((job) => (
                  <tr key={job.id} className="border-t">
                    <td className="px-3 py-2">{job.filename}</td>
                    <td className="px-3 py-2">{importJobTypeLabel(job.type)}</td>
                    <td className="px-3 py-2">{importJobStatusLabel(job.status)}</td>
                    <td className="px-3 py-2">
                      {job.successRows}/{job.failedRows}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModulePage>
  );
}
