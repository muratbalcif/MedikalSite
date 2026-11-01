"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerLinkTypeLabel } from "@/lib/enum-labels";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { bannersService } from "@/services/admin-api.service";
import { uploadResizedImage } from "@/lib/r2-image-upload";

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkType: string;
  linkValue: string | null;
  active: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
};

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  linkType: "NONE",
  linkValue: "",
  sortOrder: "0",
  active: true,
  startsAt: "",
  endsAt: "",
};

async function uploadBannerImage(file: File, folder: string): Promise<string> {
  const uploaded = await uploadResizedImage({ file, folder });
  return uploaded.publicUrl;
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BannersPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const list = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => bannersService.list(),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(row: BannerRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      subtitle: row.subtitle ?? "",
      imageUrl: row.imageUrl,
      mobileImageUrl: row.mobileImageUrl ?? "",
      linkType: row.linkType || "NONE",
      linkValue: row.linkValue ?? "",
      sortOrder: String(row.sortOrder ?? 0),
      active: row.active,
      startsAt: toLocalInput(row.startsAt),
      endsAt: toLocalInput(row.endsAt),
    });
    setFormError(null);
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.imageUrl.trim()) {
        throw new Error("Başlık ve görsel zorunlu");
      }
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        mobileImageUrl: form.mobileImageUrl.trim() || undefined,
        linkType: form.linkType,
        linkValue:
          form.linkType === "NONE" ? undefined : form.linkValue.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      };
      if (editingId) {
        return bannersService.update(editingId, {
          ...body,
          subtitle: form.subtitle.trim() || null,
          mobileImageUrl: form.mobileImageUrl.trim() || null,
          linkValue:
            form.linkType === "NONE" ? null : form.linkValue.trim() || null,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        });
      }
      return bannersService.create(body);
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => bannersService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    },
  });

  async function onPickImage(
    file: File | null,
    field: "imageUrl" | "mobileImageUrl",
  ) {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const url = await uploadBannerImage(file, "banners");
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  }

  const rows = (list.data ?? []) as BannerRow[];

  return (
    <ModulePage permission="banner.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Bannerlar
            </h1>
            <p className="text-sm text-slate-500">
              Görseller R2 presign ile yüklenir. Silme soft-deactivate yapar.
            </p>
          </div>
          {can("banner.create") ? (
            <button
              type="button"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              onClick={() => (showForm && !editingId ? setShowForm(false) : openCreate())}
            >
              {showForm && !editingId ? "Kapat" : "Yeni banner"}
            </button>
          ) : null}
        </div>

        {showForm ? (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              saveMutation.mutate();
            }}
          >
            <p className="sm:col-span-2 text-sm font-medium text-slate-700">
              {editingId ? "Banner düzenle" : "Yeni banner"}
            </p>
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Başlık"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Alt başlık"
              value={form.subtitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, subtitle: e.target.value }))
              }
            />
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs text-slate-500">
                Masaüstü görsel (JPEG/PNG/WEBP)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[240px] flex-1 rounded border px-3 py-2 text-sm"
                  placeholder="imageUrl"
                  required
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) =>
                    void onPickImage(e.target.files?.[0] ?? null, "imageUrl")
                  }
                />
              </div>
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  className="mt-1 h-16 rounded border object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs text-slate-500">
                Mobil görsel (opsiyonel)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[240px] flex-1 rounded border px-3 py-2 text-sm"
                  placeholder="mobileImageUrl"
                  value={form.mobileImageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mobileImageUrl: e.target.value }))
                  }
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) =>
                    void onPickImage(
                      e.target.files?.[0] ?? null,
                      "mobileImageUrl",
                    )
                  }
                />
              </div>
            </div>
            <select
              className="rounded border px-3 py-2 text-sm"
              value={form.linkType}
              onChange={(e) =>
                setForm((f) => ({ ...f, linkType: e.target.value }))
              }
            >
              <option value="NONE">Yok</option>
              <option value="PRODUCT">Ürün</option>
              <option value="CATEGORY">Kategori</option>
              <option value="CAMPAIGN">Kampanya</option>
              <option value="URL">Bağlantı (URL)</option>
            </select>
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Hedef (slug / URL)"
              value={form.linkValue}
              disabled={form.linkType === "NONE"}
              onChange={(e) =>
                setForm((f) => ({ ...f, linkValue: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Sıra"
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
            <input
              type="datetime-local"
              className="rounded border px-3 py-2 text-sm"
              value={form.startsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAt: e.target.value }))
              }
            />
            <input
              type="datetime-local"
              className="rounded border px-3 py-2 text-sm"
              value={form.endsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsAt: e.target.value }))
              }
            />
            {formError ? (
              <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>
            ) : null}
            {uploading ? (
              <p className="text-sm text-slate-500 sm:col-span-2">
                Görsel yükleniyor…
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saveMutation.isPending || uploading}
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
        ) : list.error ? (
          <p className="text-sm text-red-600">Banner listesi alınamadı.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz banner yok.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Başlık</th>
                  <th className="px-4 py-3 font-medium">Sıra</th>
                  <th className="px-4 py-3 font-medium">Aktif</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.imageUrl}
                          alt=""
                          className="h-10 w-16 rounded object-cover"
                        />
                        <div>
                          <div className="font-medium">{row.title}</div>
                          <div className="text-xs text-slate-500">
                            {bannerLinkTypeLabel(row.linkType)}
                            {row.linkValue ? ` · ${row.linkValue}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.sortOrder}</td>
                    <td className="px-4 py-3">{row.active ? "Evet" : "Hayır"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {can("banner.update") ? (
                          <button
                            type="button"
                            className="text-[#1b6b8f] underline"
                            onClick={() => openEdit(row)}
                          >
                            Düzenle
                          </button>
                        ) : null}
                        {can("banner.delete") && row.active ? (
                          <button
                            type="button"
                            className="text-red-700 underline"
                            disabled={removeMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `"${row.title}" bannerını pasife almak istiyor musunuz?`,
                                )
                              ) {
                                removeMutation.mutate(row.id);
                              }
                            }}
                          >
                            Pasife al
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
