"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { RichHtmlEditor } from "@/components/catalog/rich-html-editor";
import {
  ProductAttributesEditor,
  attributesToPayload,
} from "@/components/products/ProductAttributesEditor";
import {
  ProductCompatibilityEditor,
  compatibilityToPayload,
} from "@/components/products/ProductCompatibilityEditor";
import { usePermissions } from "@/hooks/use-permissions";
import { priceTypeLabel } from "@/lib/enum-labels";
import { catalogService, inventoryService } from "@/services/admin-api.service";

const TABS = [
  { id: "general", label: "Genel" },
  { id: "images", label: "Görseller" },
  { id: "attributes", label: "Teknik Özellikler" },
  { id: "compatibility", label: "Uyumluluk" },
  { id: "pricing", label: "Fiyatlar" },
  { id: "inventory", label: "Stok" },
  { id: "seo", label: "SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const id = params.id;

  const initialTab = (searchParams.get("tab") as TabId) || "general";
  const [tab, setTab] = useState<TabId>(initialTab);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const productQuery = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => catalogService.getProduct(id),
  });
  const brands = useQuery({
    queryKey: ["admin-brands-all"],
    queryFn: () => catalogService.listBrands(1, 100),
  });
  const categories = useQuery({
    queryKey: ["admin-categories-all"],
    queryFn: () => catalogService.listCategories(1, 100),
  });
  const pricesQuery = useQuery({
    queryKey: ["admin-product-prices", id],
    queryFn: () => catalogService.listProductPrices(id),
    enabled: tab === "pricing",
  });

  const product = productQuery.data;
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    brandId: "",
    categoryId: "",
    vatRate: "20",
    active: true,
    slug: "",
    metaTitle: "",
    metaDescription: "",
    technicalHtml: "",
    compatibilityHtml: "",
    attributes: [] as Array<{ name: string; value: string }>,
    compatibility: [] as Array<{
      manufacturer: string;
      model: string;
      modelYear: string;
      notes: string;
    }>,
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      description: product.description ?? "",
      brandId: product.brand.id,
      categoryId: product.category.id,
      vatRate: product.vatRate,
      active: product.active,
      slug: product.slug,
      metaTitle: product.metaTitle ?? "",
      metaDescription: product.metaDescription ?? "",
      technicalHtml: product.technicalHtml ?? "",
      compatibilityHtml: product.compatibilityHtml ?? "",
      attributes: (product.attributes ?? []).map((a) => ({
        name: a.name,
        value: a.value,
      })),
      compatibility: (product.compatibility ?? []).map((c) => ({
        manufacturer: c.manufacturer,
        model: c.model,
        modelYear: c.modelYear?.toString() ?? "",
        notes: c.notes ?? "",
      })),
    });
    setDirty(false);
  }, [product]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: () =>
      catalogService.updateProduct(id, {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || null,
        description: form.description || null,
        brandId: form.brandId,
        categoryId: form.categoryId,
        vatRate: Number(form.vatRate),
        active: form.active,
        slug: form.slug,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        technicalHtml: form.technicalHtml || null,
        compatibilityHtml: form.compatibilityHtml || null,
        attributes: attributesToPayload(form.attributes),
        compatibility: compatibilityToPayload(form.compatibility),
      }),
    onSuccess: () => {
      setDirty(false);
      setMessage("Kaydedildi");
      void queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const [priceForm, setPriceForm] = useState({
    type: "RETAIL",
    amount: "",
    validFrom: "",
    validTo: "",
  });
  const priceMutation = useMutation({
    mutationFn: () =>
      catalogService.createProductPrice(id, {
        type: priceForm.type,
        amount: Number(priceForm.amount),
        validFrom: priceForm.validFrom || undefined,
        validTo: priceForm.validTo || undefined,
        active: true,
      }),
    onSuccess: () => {
      setPriceForm({ type: "RETAIL", amount: "", validFrom: "", validTo: "" });
      void queryClient.invalidateQueries({
        queryKey: ["admin-product-prices", id],
      });
    },
  });

  const [stockQty, setStockQty] = useState("1");
  const [stockNote, setStockNote] = useState("");
  const stockIn = useMutation({
    mutationFn: () =>
      inventoryService.increase(id, Number(stockQty), stockNote || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
    },
  });
  const stockOut = useMutation({
    mutationFn: () =>
      inventoryService.decrease(id, Number(stockQty), stockNote || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
    },
  });

  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "optimizing" | "uploading"
  >("idle");
  const [uploadSizeNote, setUploadSizeNote] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadPhase("optimizing");
      setUploadSizeNote(null);
      const { uploadResizedImage } = await import("@/lib/r2-image-upload");
      const { formatSizeReduction } = await import("@/lib/resize-image");
      const uploaded = await uploadResizedImage({
        file,
        folder: `products/${id}`,
        onPhase: (phase, info) => {
          setUploadPhase(phase);
          if (info?.wasOptimized) {
            setUploadSizeNote(
              formatSizeReduction(info.originalBytes, info.optimizedBytes),
            );
          }
        },
      });
      return catalogService.registerImage(id, {
        url: uploaded.publicUrl,
        objectKey: uploaded.objectKey,
        alt: uploaded.file.name,
        isPrimary: (product?.images.length ?? 0) === 0,
      });
    },
    onSuccess: () => {
      setUploadPhase("idle");
      void queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
    },
    onError: () => {
      setUploadPhase("idle");
    },
  });

  const summary = useMemo(() => {
    if (!product) return null;
    return {
      image:
        product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url,
      price: product.price?.amount,
      stock:
        product.stock?.availableQuantity ?? product.stock?.quantity ?? 0,
      active: product.active,
    };
  }, [product]);

  if (productQuery.isLoading) {
    return (
      <ModulePage permission="product.read">
        <p>Yükleniyor…</p>
      </ModulePage>
    );
  }

  if (!product) {
    return (
      <ModulePage permission="product.read">
        <p className="text-red-700">Ürün bulunamadı.</p>
      </ModulePage>
    );
  }

  return (
    <ModulePage permission="product.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/products" className="text-sm text-[#1b6b8f] underline">
              ← Ürünler
            </Link>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {product.name}
            </h2>
            <p className="font-mono text-sm text-slate-500">{product.sku}</p>
          </div>
          {can("product.update") && (
            <button
              type="button"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="rounded-md bg-[#16324f] px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Kaydet
            </button>
          )}
        </div>

        {message && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            {message}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1 border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-2 text-sm ${
                    tab === t.id
                      ? "border-b-2 border-[#1b6b8f] font-medium text-[#16324f]"
                      : "text-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              {tab === "general" && (
                <div className="space-y-3">
                  <Field
                    label="Ürün adı"
                    value={form.name}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, name: v }));
                      setDirty(true);
                    }}
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(product.isFeatured)}
                      onChange={(e) => {
                        void catalogService
                          .setFeatured(id, { isFeatured: e.target.checked })
                          .then(() =>
                            queryClient.invalidateQueries({
                              queryKey: ["admin-product", id],
                            }),
                          );
                      }}
                    />
                    Öne çıkan (featured)
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="SKU"
                      value={form.sku}
                      onChange={(v) => {
                        setForm((f) => ({ ...f, sku: v.toUpperCase() }));
                        setDirty(true);
                      }}
                    />
                    <Field
                      label="Barkod"
                      value={form.barcode}
                      onChange={(v) => {
                        setForm((f) => ({ ...f, barcode: v }));
                        setDirty(true);
                      }}
                    />
                  </div>
                  <label className="block text-sm">
                    Açıklama
                    <textarea
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      rows={4}
                      value={form.description}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }));
                        setDirty(true);
                      }}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      Marka
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={form.brandId}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, brandId: e.target.value }));
                          setDirty(true);
                        }}
                      >
                        {(brands.data?.items ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      Kategori
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={form.categoryId}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            categoryId: e.target.value,
                          }));
                          setDirty(true);
                        }}
                      >
                        {(categories.data?.items ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Field
                    label="KDV %"
                    value={form.vatRate}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, vatRate: v }));
                      setDirty(true);
                    }}
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, active: e.target.checked }));
                        setDirty(true);
                      }}
                    />
                    Aktif
                  </label>
                </div>
              )}

              {tab === "images" && (
                <div className="space-y-4">
                  {can("product.update") && (
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadMutation.mutate(file);
                          e.target.value = "";
                        }}
                      />
                      <p className="text-xs text-slate-500">
                        Büyük görseller otomatik optimize edilir (max 1920px,
                        WebP, ≤5&nbsp;MB).
                      </p>
                    </div>
                  )}
                  {uploadPhase === "optimizing" && (
                    <p className="text-sm text-slate-600">
                      Görsel optimize ediliyor…
                    </p>
                  )}
                  {uploadPhase === "uploading" && (
                    <p className="text-sm text-slate-600">
                      Yükleniyor…
                      {uploadSizeNote ? ` (${uploadSizeNote})` : ""}
                    </p>
                  )}
                  {uploadMutation.isError && (
                    <p className="text-sm text-red-700">
                      {(uploadMutation.error as Error).message}
                    </p>
                  )}
                  {uploadSizeNote && uploadMutation.isSuccess && (
                    <p className="text-xs text-emerald-700">
                      Optimize edildi: {uploadSizeNote}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {product.images.map((img) => (
                      <div
                        key={img.id}
                        className="rounded-lg border border-slate-200 p-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.alt ?? ""}
                          className="h-28 w-full rounded object-cover"
                        />
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {img.isPrimary ? (
                            <span className="text-emerald-700">Primary</span>
                          ) : (
                            can("product.update") && (
                              <button
                                type="button"
                                className="underline"
                                onClick={() =>
                                  void catalogService
                                    .setPrimaryImage(id, img.id)
                                    .then(() =>
                                      queryClient.invalidateQueries({
                                        queryKey: ["admin-product", id],
                                      }),
                                    )
                                }
                              >
                                Primary yap
                              </button>
                            )
                          )}
                          {can("product.update") && (
                            <button
                              type="button"
                              className="text-red-700 underline"
                              onClick={() =>
                                void catalogService
                                  .deleteImage(id, img.id)
                                  .then(() =>
                                    queryClient.invalidateQueries({
                                      queryKey: ["admin-product", id],
                                    }),
                                  )
                              }
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "attributes" && (
                <div className="space-y-6">
                  <ProductAttributesEditor
                    value={form.attributes}
                    onChange={(attributes) => {
                      setForm((f) => ({ ...f, attributes }));
                      setDirty(true);
                    }}
                  />
                  <div className="border-t border-slate-100 pt-4">
                    <RichHtmlEditor
                      label="Zengin teknik içerik (HTML)"
                      value={form.technicalHtml}
                      onChange={(html) => {
                        setForm((f) => ({ ...f, technicalHtml: html }));
                        setDirty(true);
                      }}
                      placeholder="Tablo, liste ve başlıklarla teknik açıklama…"
                    />
                  </div>
                </div>
              )}

              {tab === "compatibility" && (
                <div className="space-y-6">
                  <ProductCompatibilityEditor
                    value={form.compatibility}
                    onChange={(compatibility) => {
                      setForm((f) => ({ ...f, compatibility }));
                      setDirty(true);
                    }}
                  />
                  <div className="border-t border-slate-100 pt-4">
                    <RichHtmlEditor
                      label="Uyumluluk zengin içerik (HTML)"
                      value={form.compatibilityHtml}
                      onChange={(html) => {
                        setForm((f) => ({ ...f, compatibilityHtml: html }));
                        setDirty(true);
                      }}
                      placeholder="Uyumluluk notları, tablolar, ek açıklamalar…"
                    />
                  </div>
                </div>
              )}

              {tab === "pricing" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2">Tip</th>
                          <th>Tutar</th>
                          <th>Başlangıç</th>
                          <th>Bitiş</th>
                          <th>Aktif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pricesQuery.data ?? []).map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="py-2">{priceTypeLabel(p.type)}</td>
                            <td>{p.price ?? p.amount}</td>
                            <td>{p.validFrom ?? "—"}</td>
                            <td>{p.validTo ?? "—"}</td>
                            <td>{p.active ? "Evet" : "Hayır"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {can("pricing.create") && (
                    <div className="grid gap-2 sm:grid-cols-4">
                      <select
                        className="rounded-md border px-3 py-2 text-sm"
                        value={priceForm.type}
                        onChange={(e) =>
                          setPriceForm((f) => ({ ...f, type: e.target.value }))
                        }
                      >
                        <option value="RETAIL">Perakende</option>
                        <option value="CAMPAIGN">Kampanya</option>
                        <option value="WHOLESALE">Toptan</option>
                        <option value="CORPORATE">Kurumsal</option>
                      </select>
                      <input
                        className="rounded-md border px-3 py-2 text-sm"
                        placeholder="Tutar"
                        value={priceForm.amount}
                        onChange={(e) =>
                          setPriceForm((f) => ({
                            ...f,
                            amount: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="date"
                        className="rounded-md border px-3 py-2 text-sm"
                        value={priceForm.validFrom}
                        onChange={(e) =>
                          setPriceForm((f) => ({
                            ...f,
                            validFrom: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="date"
                        className="rounded-md border px-3 py-2 text-sm"
                        value={priceForm.validTo}
                        onChange={(e) =>
                          setPriceForm((f) => ({
                            ...f,
                            validTo: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white sm:col-span-4"
                        onClick={() => priceMutation.mutate()}
                      >
                        Fiyat ekle
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === "inventory" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Mevcut: {summary?.stock ?? 0} (available backend hesabı)
                  </p>
                  {can("stock.update") && (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="number"
                        min={1}
                        className="w-28 rounded-md border px-3 py-2 text-sm"
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                      />
                      <input
                        className="min-w-[160px] flex-1 rounded-md border px-3 py-2 text-sm"
                        placeholder="Not / referans"
                        value={stockNote}
                        onChange={(e) => setStockNote(e.target.value)}
                      />
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-sm"
                        onClick={() => stockIn.mutate()}
                      >
                        Stok giriş
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-sm"
                        onClick={() => stockOut.mutate()}
                      >
                        Stok çıkış
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === "seo" && (
                <div className="space-y-3">
                  <Field
                    label="Slug"
                    value={form.slug}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, slug: v }));
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Meta title"
                    value={form.metaTitle}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, metaTitle: v }));
                      setDirty(true);
                    }}
                  />
                  <label className="block text-sm">
                    Meta description
                    <textarea
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          metaDescription: e.target.value,
                        }));
                        setDirty(true);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            {summary?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.image}
                alt=""
                className="h-40 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
                Görsel yok
              </div>
            )}
            <div className="text-sm">
              <p>
                Durum:{" "}
                <strong>{summary?.active ? "Aktif" : "Pasif"}</strong>
              </p>
              <p>Fiyat: {summary?.price ? `${summary.price} ₺` : "—"}</p>
              <p>Stok: {summary?.stock ?? 0}</p>
            </div>
          </aside>
        </div>
      </div>
    </ModulePage>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className="mt-1 w-full rounded-md border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
