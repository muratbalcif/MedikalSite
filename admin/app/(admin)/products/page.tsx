"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { catalogService, type AdminProduct } from "@/services/admin-api.service";

export default function ProductsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [selected, setSelected] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["admin-products", page, submittedSearch, activeFilter],
    queryFn: () =>
      catalogService.listProducts(page, 20, {
        search: submittedSearch || undefined,
        active:
          activeFilter === ""
            ? undefined
            : activeFilter === "true",
        sort: "newest",
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      catalogService.updateProduct(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (active: boolean) =>
      catalogService.bulkStatus(selected, active),
    onSuccess: () => {
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogService.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const items = query.data?.items ?? [];
  const totalPages = useMemo(() => {
    const total = query.data?.meta.total ?? 0;
    const limit = query.data?.meta.limit ?? 20;
    return Math.max(1, Math.ceil(total / limit));
  }, [query.data]);

  const primaryImage = (product: AdminProduct) =>
    product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url;

  return (
    <ModulePage permission="product.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Ürünler
            </h2>
            <p className="text-sm text-slate-500">
              Sunucu taraflı arama, filtre ve sayfalama
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can("import.create") && (
              <Link
                href="/imports/products"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                Toplu Aktarım
              </Link>
            )}
            {can("product.create") && (
              <Link
                href="/products/new"
                className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              >
                Yeni Ürün
              </Link>
            )}
          </div>
        </div>

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmittedSearch(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, SKU, barkod, marka, kategori…"
            className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={activeFilter}
            onChange={(e) => {
              setPage(1);
              setActiveFilter(e.target.value as "" | "true" | "false");
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tüm durumlar</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            Ara
          </button>
        </form>

        {selected.length > 0 && can("product.update") && (
          <div className="flex flex-wrap gap-2 rounded-lg border border-[#d9e8ef] bg-[#f0f5f8] px-3 py-2 text-sm">
            <span>{selected.length} seçili</span>
            <button
              type="button"
              onClick={() => bulkMutation.mutate(true)}
              className="underline"
            >
              Aktifleştir
            </button>
            <button
              type="button"
              onClick={() => bulkMutation.mutate(false)}
              className="underline"
            >
              Pasifleştir
            </button>
          </div>
        )}

        {query.isLoading ? (
          <p className="text-slate-600">Yükleniyor…</p>
        ) : query.error ? (
          <p className="text-red-700">Ürün listesi alınamadı.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        items.length > 0 &&
                        items.every((p) => selected.includes(p.id))
                      }
                      onChange={(e) => {
                        setSelected(
                          e.target.checked ? items.map((p) => p.id) : [],
                        );
                      }}
                    />
                  </th>
                  <th className="px-3 py-3">Görsel</th>
                  <th className="px-3 py-3">Ad</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Barkod</th>
                  <th className="px-3 py-3">Marka</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3">Fiyat</th>
                  <th className="px-3 py-3">Stok</th>
                  <th className="px-3 py-3">Durum</th>
                  <th className="px-3 py-3">Güncelleme</th>
                  <th className="px-3 py-3">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(product.id)}
                        onChange={(e) => {
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, product.id]
                              : prev.filter((id) => id !== product.id),
                          );
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {primaryImage(product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={primaryImage(product)}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{product.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {product.barcode ?? "—"}
                    </td>
                    <td className="px-3 py-2">{product.brand.name}</td>
                    <td className="px-3 py-2">{product.category.name}</td>
                    <td className="px-3 py-2">
                      {product.price?.amount
                        ? `${product.price.amount} ₺`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {product.stock?.availableQuantity ??
                        product.stock?.quantity ??
                        0}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          product.active
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {product.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(product.updatedAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-[#1b6b8f] underline"
                        >
                          Görüntüle
                        </Link>
                        {can("product.update") && (
                          <Link
                            href={`/products/${product.id}?tab=general`}
                            className="text-[#1b6b8f] underline"
                          >
                            Düzenle
                          </Link>
                        )}
                        {can("product.update") && (
                          <button
                            type="button"
                            className="text-slate-700 underline"
                            onClick={() =>
                              toggleMutation.mutate({
                                id: product.id,
                                active: !product.active,
                              })
                            }
                          >
                            {product.active ? "Pasif" : "Aktif"}
                          </button>
                        )}
                        {can("product.delete") && (
                          <button
                            type="button"
                            className="text-red-700 underline"
                            onClick={() => {
                              if (
                                confirm(
                                  "Ürün pasifleştirilecek (hard delete yok). Devam?",
                                )
                              ) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              <span>Toplam: {query.data?.meta.total ?? 0}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border px-2 py-1 disabled:opacity-40"
                >
                  Önceki
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-2 py-1 disabled:opacity-40"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
