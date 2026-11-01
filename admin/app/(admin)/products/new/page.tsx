"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { catalogService } from "@/services/admin-api.service";

function slugify(input: string): string {
  const map: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };
  return input
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export default function NewProductPage() {
  const router = useRouter();
  const brands = useQuery({
    queryKey: ["admin-brands-all"],
    queryFn: () => catalogService.listBrands(1, 100),
  });
  const categories = useQuery({
    queryKey: ["admin-categories-all"],
    queryFn: () => catalogService.listCategories(1, 100),
  });

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
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      catalogService.createProduct({
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        brandId: form.brandId,
        categoryId: form.categoryId,
        vatRate: Number(form.vatRate),
        active: form.active,
        slug: form.slug || slugify(form.name),
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
      }),
    onSuccess: (product) => {
      router.push(`/products/${product.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <ModulePage permission="product.create">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Yeni Ürün
          </h2>
          <Link href="/products" className="text-sm text-[#1b6b8f] underline">
            Listeye dön
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Genel
            </h3>
            <label className="block text-sm">
              Ürün adı
              <input
                required
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: f.slug ? f.slug : slugify(name),
                  }));
                }}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                SKU
                <input
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2 font-mono"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))
                  }
                />
              </label>
              <label className="block text-sm">
                Barkod
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="block text-sm">
              Açıklama
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Marka
                <select
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={form.brandId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brandId: e.target.value }))
                  }
                >
                  <option value="">Seçin</option>
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
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                >
                  <option value="">Seçin</option>
                  {(categories.data?.items ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Aktif
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Vergi
            </h3>
            <label className="block text-sm">
              KDV oranı (%)
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="mt-1 w-40 rounded-md border px-3 py-2"
                value={form.vatRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vatRate: e.target.value }))
                }
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              SEO
            </h3>
            <label className="block text-sm">
              Slug
              <input
                required
                className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              Meta title
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={form.metaTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, metaTitle: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              Meta description
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={2}
                value={form.metaDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, metaDescription: e.target.value }))
                }
              />
            </label>
          </section>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-[#16324f] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {createMutation.isPending ? "Kaydediliyor…" : "Ürün oluştur"}
          </button>
        </form>
      </div>
    </ModulePage>
  );
}
