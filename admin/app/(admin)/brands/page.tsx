"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import { catalogService } from "@/services/admin-api.service";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  description?: string | null;
  sortOrder?: number;
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  active: true,
};

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
    .slice(0, 180);
}

export default function BrandsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const canCreate = can("brand.create");
  const canUpdate = can("brand.update");
  const canDelete = can("brand.delete");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const list = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => catalogService.listBrands(1, 100),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(row: BrandRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
      sortOrder: String(row.sortOrder ?? 0),
      active: row.active,
    });
    setSlugTouched(true);
    setFormError(null);
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.slug.trim()) {
        throw new Error("Ad ve slug zorunlu");
      }
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      if (editingId) {
        return catalogService.updateBrand(editingId, body);
      }
      return catalogService.createBrand(body);
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (err: Error) => {
      setFormError(
        err instanceof ApiError ? err.message : err.message || "Kayıt başarısız",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogService.deleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
  });

  const rows = list.data?.items ?? [];

  return (
    <ModulePage permission="brand.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Markalar
            </h1>
            <p className="text-sm text-slate-600">
              Toplam: {list.data?.meta.total ?? rows.length}
            </p>
          </div>
          {canCreate ? (
            <button
              type="button"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              onClick={() =>
                showForm && !editingId ? setShowForm(false) : openCreate()
              }
            >
              {showForm && !editingId ? "Kapat" : "Yeni marka"}
            </button>
          ) : null}
        </div>

        {showForm && (editingId ? canUpdate : canCreate) ? (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Ad"
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: slugTouched ? f.slug : slugify(name),
                }));
              }}
            />
            <input
              className="rounded border px-3 py-2 font-mono text-sm"
              placeholder="slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
            />
            <input
              className="rounded border px-3 py-2 text-sm sm:col-span-2"
              placeholder="Açıklama"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Sıra"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Aktif
            </label>
            {formError ? (
              <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                İptal
              </button>
            </div>
          </form>
        ) : null}

        {list.isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : list.isError ? (
          <p className="text-sm text-red-600">
            {list.error instanceof ApiError
              ? list.error.message
              : "Liste yüklenemedi"}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Marka bulunamadı.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Ad</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 text-slate-500">{row.slug}</td>
                    <td className="px-4 py-3">
                      {row.active ? "Aktif" : "Pasif"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => openEdit(row)}
                          >
                            Düzenle
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `"${row.name}" markasını silmek istiyor musunuz?`,
                                )
                              ) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            Sil
                          </button>
                        ) : null}
                      </div>
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
