"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import {
  type AdminBankAccount,
  paymentsService,
} from "@/services/admin-api.service";

const EMPTY_FORM = {
  bankName: "",
  accountName: "",
  iban: "",
  branch: "",
  accountNumber: "",
  currency: "TRY",
  description: "",
  sortOrder: "0",
  active: true,
};

export default function BankAccountsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const canUpdate = can("payment.update");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-bank-accounts"],
    queryFn: () => paymentsService.listBankAccounts(),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(row: AdminBankAccount) {
    setEditingId(row.id);
    setForm({
      bankName: row.bankName,
      accountName: row.accountName,
      iban: row.iban,
      branch: row.branch ?? "",
      accountNumber: row.accountNumber ?? "",
      currency: row.currency || "TRY",
      description: row.description ?? "",
      sortOrder: String(row.sortOrder ?? 0),
      active: row.active,
    });
    setFormError(null);
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const iban = form.iban.replace(/\s+/g, "").toUpperCase();
      if (!/^TR[0-9]{24}$/i.test(iban)) {
        throw new Error("IBAN TR + 24 rakam formatında olmalı");
      }
      if (!form.bankName.trim() || !form.accountName.trim()) {
        throw new Error("Banka ve hesap adı zorunlu");
      }
      const body = {
        bankName: form.bankName.trim(),
        accountName: form.accountName.trim(),
        iban,
        branch: form.branch.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        currency: form.currency.trim() || "TRY",
        description: form.description.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };
      if (editingId) {
        return paymentsService.updateBankAccount(editingId, body);
      }
      return paymentsService.createBankAccount(body);
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] });
    },
    onError: (err: Error) => {
      setFormError(
        err instanceof ApiError ? err.message : err.message || "Kayıt başarısız",
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (row: AdminBankAccount) =>
      paymentsService.updateBankAccount(row.id, {
        bankName: row.bankName,
        accountName: row.accountName,
        iban: row.iban,
        branch: row.branch ?? undefined,
        accountNumber: row.accountNumber ?? undefined,
        currency: row.currency,
        description: row.description ?? undefined,
        sortOrder: row.sortOrder,
        active: false,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] });
    },
  });

  const rows = list.data ?? [];

  return (
    <ModulePage permission="payment.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Banka hesapları
            </h1>
            <p className="text-sm text-slate-600">
              Checkout havale ekranı yalnızca aktif hesapları gösterir. Aynı{" "}
              <code className="text-xs">/admin/bank-accounts</code> kaynağı.
            </p>
          </div>
          {canUpdate ? (
            <button
              type="button"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              onClick={() =>
                showForm && !editingId ? setShowForm(false) : openCreate()
              }
            >
              {showForm && !editingId ? "Kapat" : "Yeni hesap"}
            </button>
          ) : null}
        </div>

        {showForm && canUpdate ? (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              saveMutation.mutate();
            }}
          >
            <p className="sm:col-span-2 text-sm font-medium text-slate-700">
              {editingId ? "Hesap düzenle" : "Yeni banka hesabı"}
            </p>
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Banka adı"
              required
              value={form.bankName}
              onChange={(e) =>
                setForm((f) => ({ ...f, bankName: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Hesap adı"
              required
              value={form.accountName}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountName: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm sm:col-span-2"
              placeholder="IBAN (TR…)"
              required
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Şube"
              value={form.branch}
              onChange={(e) =>
                setForm((f) => ({ ...f, branch: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Hesap no"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Para birimi"
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value }))
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
            <input
              className="rounded border px-3 py-2 text-sm sm:col-span-2"
              placeholder="Açıklama"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
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
              Aktif (checkout’ta görünür)
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
        ) : list.error ? (
          <p className="text-sm text-red-600">Banka hesapları alınamadı.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz banka hesabı yok.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Banka</th>
                  <th className="px-4 py-3 font-medium">IBAN</th>
                  <th className="px-4 py-3 font-medium">Sıra</th>
                  <th className="px-4 py-3 font-medium">Aktif</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.bankName}</div>
                      <div className="text-xs text-slate-500">
                        {row.accountName}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.iban}</td>
                    <td className="px-4 py-3">{row.sortOrder}</td>
                    <td className="px-4 py-3">{row.active ? "Evet" : "Hayır"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                          <button
                            type="button"
                            className="text-[#1b6b8f] underline"
                            onClick={() => openEdit(row)}
                          >
                            Düzenle
                          </button>
                        ) : null}
                        {canUpdate && row.active ? (
                          <button
                            type="button"
                            className="text-red-700 underline"
                            disabled={deactivateMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `"${row.bankName}" hesabını pasife almak istiyor musunuz? Checkout’ta görünmez.`,
                                )
                              ) {
                                deactivateMutation.mutate(row);
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
