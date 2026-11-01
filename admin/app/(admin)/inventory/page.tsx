"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { DataPageShell } from "@/components/ui/data-page-shell";
import { inventoryService } from "@/services/admin-api.service";

export default function InventoryPage() {
  const critical = useQuery({
    queryKey: ["admin-inventory-critical"],
    queryFn: () => inventoryService.critical(),
  });

  return (
    <ModulePage permission="stock.read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Stok Durumu
            </h2>
            <p className="text-sm text-slate-500">
              Available = quantity − reservedQuantity (backend)
            </p>
          </div>
          <Link
            href="/imports/stock"
            className="rounded-md border px-3 py-2 text-sm"
          >
            Toplu Stok Güncelleme
          </Link>
        </div>

        {critical.data && critical.data.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">Kritik Stoklar</h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {critical.data.slice(0, 10).map((item) => (
                <li key={item.productId}>
                  <Link
                    href={`/products/${item.productId}?tab=inventory`}
                    className="underline"
                  >
                    {item.sku}
                  </Link>{" "}
                  — available {item.availableQuantity} / min{" "}
                  {item.minimumQuantity}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DataPageShell
          title="Tüm stok kayıtları"
          permission="stock.read"
          queryKey={["admin-inventory"]}
          queryFn={() => inventoryService.list(1, 50)}
          emptyMessage="Stok kaydı bulunamadı."
        >
          {(data) => (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ürün</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Miktar</th>
                    <th className="px-4 py-3 font-medium">Rezerve</th>
                    <th className="px-4 py-3 font-medium">Kullanılabilir</th>
                    <th className="px-4 py-3 font-medium">Min</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const available = row.availableQuantity;
                    const min = row.minimumQuantity ?? 0;
                    const criticalRow = available <= min;
                    return (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <Link
                            href={`/products/${row.productId}?tab=inventory`}
                            className="text-[#1b6b8f] underline"
                          >
                            {row.product?.name ?? row.productId.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.product?.sku ?? "—"}
                        </td>
                        <td className="px-4 py-3">{row.quantity}</td>
                        <td className="px-4 py-3">{row.reservedQuantity}</td>
                        <td className="px-4 py-3">{available}</td>
                        <td className="px-4 py-3">{min}</td>
                        <td className="px-4 py-3">
                          {criticalRow ? (
                            <span className="text-amber-700">Kritik</span>
                          ) : available > 0 ? (
                            <span className="text-emerald-700">OK</span>
                          ) : (
                            <span className="text-slate-500">Yok</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                Toplam: {data.meta.total}
              </div>
            </div>
          )}
        </DataPageShell>
      </div>
    </ModulePage>
  );
}
