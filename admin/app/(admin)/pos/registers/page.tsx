"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import {
  type AdminPosRegister,
  posAdminService,
} from "@/services/admin-api.service";

const EMPTY_FORM = {
  name: "",
  code: "",
  isActive: true,
};

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PosRegistersPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = can("pos.register");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-pos-registers"],
    queryFn: () => posAdminService.listRegisters(),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(row: AdminPosRegister) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      code: row.code,
      isActive: row.isActive,
    });
    setFormError(null);
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const code = form.code.trim().toUpperCase();
      if (!name || !code) {
        throw new Error("Kasa adı ve kodu zorunlu");
      }
      if (!/^[A-Za-z0-9_-]+$/.test(code)) {
        throw new Error("Kod yalnızca harf, rakam, - ve _ içerebilir");
      }
      if (editingId) {
        return posAdminService.updateRegister(editingId, {
          name,
          code,
          isActive: form.isActive,
        });
      }
      return posAdminService.createRegister({
        name,
        code,
        isActive: form.isActive,
      });
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-pos-registers"] });
    },
    onError: (err: Error) => {
      setFormError(
        err instanceof ApiError ? err.message : err.message || "Kayıt başarısız",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (row: AdminPosRegister) =>
      posAdminService.updateRegister(row.id, { isActive: !row.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-pos-registers"] });
    },
  });

  const rows = list.data ?? [];

  return (
    <ModulePage permission="pos.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">POS</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Kasalar
            </h1>
            <p className="text-sm text-slate-600">
              Aktif kasalar Windows POS satışında seçilebilir. Pasif kasa ile
              satış engellenir.
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              onClick={() =>
                showForm && !editingId ? setShowForm(false) : openCreate()
              }
            >
              {showForm && !editingId ? "Kapat" : "Yeni kasa"}
            </button>
          ) : null}
        </div>

        {showForm && canManage ? (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              saveMutation.mutate();
            }}
          >
            <p className="sm:col-span-2 text-sm font-medium text-slate-700">
              {editingId ? "Kasa düzenle" : "Yeni kasa"}
            </p>
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Kasa adı"
              required
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm font-mono uppercase"
              placeholder="Kod (örn. KASA2)"
              required
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value }))
              }
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
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
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : list.error ? (
          <p className="text-sm text-red-600">Kasalar alınamadı.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz kasa yok.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Kasa adı</th>
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Oluşturulma</th>
                  <th className="px-4 py-3 font-medium">Güncelleme</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.isActive
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {row.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDt(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDt(row.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canManage ? (
                          <button
                            type="button"
                            className="text-[#1b6b8f] underline"
                            onClick={() => openEdit(row)}
                          >
                            Düzenle
                          </button>
                        ) : null}
                        {canManage ? (
                          <button
                            type="button"
                            className={
                              row.isActive
                                ? "text-amber-700 underline"
                                : "text-emerald-700 underline"
                            }
                            disabled={toggleMutation.isPending}
                            onClick={() => {
                              const next = row.isActive ? "pasif" : "aktif";
                              if (
                                window.confirm(
                                  `"${row.name}" kasasını ${next} yapmak istiyor musunuz?`,
                                )
                              ) {
                                toggleMutation.mutate(row);
                              }
                            }}
                          >
                            {row.isActive ? "Pasife al" : "Aktifleştir"}
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
