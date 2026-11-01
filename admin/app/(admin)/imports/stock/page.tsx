"use client";

import Link from "next/link";
import { ModulePage } from "@/components/auth/module-page";
import { ImportFlow } from "@/components/catalog/import-flow";
import { importsService } from "@/services/admin-api.service";

export default function StockImportPage() {
  return (
    <ModulePage permission="import.create">
      <div className="space-y-4">
        <Link href="/imports" className="text-sm text-[#1b6b8f] underline">
          ← Toplu işlemler
        </Link>
        <ImportFlow
          kind="stock"
          title="Toplu Stok Güncelleme"
          previewFn={(file) => importsService.previewStock(file)}
        />
      </div>
    </ModulePage>
  );
}
