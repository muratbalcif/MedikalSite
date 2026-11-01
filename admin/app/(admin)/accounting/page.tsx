"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountTxTypeLabel } from "@/lib/enum-labels";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import {
  accountingService,
  customersAdminService,
} from "@/services/admin-api.service";

type LedgerMode = "manual" | "adjustment" | "reversal";

export default function AccountingPage() {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [mode, setMode] = useState<LedgerMode>("manual");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    direction: "DEBIT" as "DEBIT" | "CREDIT",
    amount: "",
    description: "",
    note: "",
    originalReference: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-accounting"],
    queryFn: () => accountingService.listTransactions(1, 50),
  });

  const customersQuery = useQuery({
    queryKey: ["admin-accounting-customer-search", customerSearch],
    queryFn: () =>
      customersAdminService.list(1, 10, {
        search: customerSearch || undefined,
      }),
    enabled: customerSearch.trim().length >= 2,
  });

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["admin-accounting"] });

  const manualMutation = useMutation({
    mutationFn: () => {
      if (!selectedCustomer) throw new Error("Müşteri seçin");
      return accountingService.createManual({
        customerId: selectedCustomer.id,
        direction: form.direction,
        amount: form.amount,
        description: form.description,
      });
    },
    onSuccess: () => {
      setFormError(null);
      setForm((f) => ({ ...f, amount: "", description: "", note: "" }));
      invalidate();
    },
    onError: (err: Error) =>
      setFormError(err instanceof ApiError ? err.message : err.message),
  });

  const adjustmentMutation = useMutation({
    mutationFn: () => {
      if (!selectedCustomer) throw new Error("Müşteri seçin");
      if (!form.note.trim()) throw new Error("Düzeltme notu zorunlu");
      return accountingService.createAdjustment({
        customerId: selectedCustomer.id,
        direction: form.direction,
        amount: form.amount,
        note: form.note.trim(),
      });
    },
    onSuccess: () => {
      setFormError(null);
      setForm((f) => ({ ...f, amount: "", note: "" }));
      invalidate();
    },
    onError: (err: Error) =>
      setFormError(err instanceof ApiError ? err.message : err.message),
  });

  const reversalMutation = useMutation({
    mutationFn: () => {
      if (!selectedCustomer) throw new Error("Müşteri seçin");
      if (!form.originalReference.trim()) {
        throw new Error("Orijinal referans zorunlu");
      }
      if (!form.note.trim()) throw new Error("İptal notu zorunlu");
      return accountingService.createReversal({
        customerId: selectedCustomer.id,
        originalReference: form.originalReference.trim(),
        note: form.note.trim(),
      });
    },
    onSuccess: () => {
      setFormError(null);
      setForm((f) => ({ ...f, originalReference: "", note: "" }));
      invalidate();
    },
    onError: (err: Error) =>
      setFormError(err instanceof ApiError ? err.message : err.message),
  });

  const customerHits = customersQuery.data?.items ?? [];
  const pending =
    manualMutation.isPending ||
    adjustmentMutation.isPending ||
    reversalMutation.isPending;

  const modeLabel = useMemo(
    () => ({
      manual: "Manuel hareket",
      adjustment: "Düzeltme (ADJUSTMENT)",
      reversal: "İptal / ters kayıt (REVERSAL)",
    }),
    [],
  );

  function submit() {
    setFormError(null);
    if (mode === "manual") manualMutation.mutate();
    else if (mode === "adjustment") adjustmentMutation.mutate();
    else reversalMutation.mutate();
  }

  return (
    <ModulePage permission="accounting.read">
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Cari Hesap
        </h1>
        <p className="text-sm text-slate-500">
          Ledger immutable. Düzeltmeler ADJUSTMENT / REVERSAL ile yapılır; hard
          delete yok.
        </p>

        {can("accounting.create") && (
          <div className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {(["manual", "adjustment", "reversal"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setFormError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    mode === m
                      ? "bg-[#16324f] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {modeLabel[m]}
                </button>
              ))}
            </div>

            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="sm:col-span-2 space-y-1">
                <input
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder="Müşteri ara (ad / e-posta)"
                  value={
                    selectedCustomer
                      ? selectedCustomer.label
                      : customerSearch
                  }
                  onChange={(e) => {
                    setSelectedCustomer(null);
                    setCustomerSearch(e.target.value);
                  }}
                />
                {selectedCustomer ? (
                  <p className="text-xs text-slate-500">
                    Seçili: {selectedCustomer.id}
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                      }}
                    >
                      Temizle
                    </button>
                  </p>
                ) : null}
                {!selectedCustomer && customerSearch.trim().length >= 2 ? (
                  <ul className="max-h-40 overflow-auto rounded border text-sm">
                    {customersQuery.isLoading ? (
                      <li className="px-2 py-1 text-slate-500">Aranıyor…</li>
                    ) : customerHits.length === 0 ? (
                      <li className="px-2 py-1 text-slate-500">
                        Müşteri bulunamadı
                      </li>
                    ) : (
                      customerHits.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-2 py-1.5 text-left hover:bg-slate-50"
                            onClick={() => {
                              setSelectedCustomer({
                                id: c.id,
                                label: `${c.firstName} ${c.lastName} · ${c.email}`,
                              });
                              setCustomerSearch("");
                            }}
                          >
                            {c.firstName} {c.lastName} · {c.email}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>

              {mode !== "reversal" ? (
                <>
                  <select
                    value={form.direction}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        direction: e.target.value as "DEBIT" | "CREDIT",
                      }))
                    }
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="DEBIT">Borç</option>
                    <option value="CREDIT">Alacak</option>
                  </select>
                  <input
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="Tutar"
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </>
              ) : (
                <input
                  required
                  value={form.originalReference}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      originalReference: e.target.value,
                    }))
                  }
                  placeholder="Orijinal referans (listeden seçilebilir)"
                  className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
                />
              )}

              {mode === "manual" ? (
                <input
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Açıklama"
                  className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
                />
              ) : (
                <input
                  required
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder={
                    mode === "adjustment"
                      ? "Düzeltme notu (zorunlu)"
                      : "İptal notu (zorunlu)"
                  }
                  className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
                />
              )}

              {formError ? (
                <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="rounded bg-[#16324f] px-3 py-1.5 text-sm text-white disabled:opacity-50 sm:col-span-2"
              >
                {pending ? "Kaydediliyor…" : modeLabel[mode]}
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Tip</th>
                  <th className="px-4 py-3 font-medium">Referans</th>
                  <th className="px-4 py-3 font-medium">Borç</th>
                  <th className="px-4 py-3 font-medium">Alacak</th>
                  <th className="px-4 py-3 font-medium">Bakiye</th>
                  <th className="px-4 py-3 font-medium">Açıklama</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{accountTxTypeLabel(row.type)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3">{row.debit ?? ""}</td>
                    <td className="px-4 py-3">{row.credit ?? ""}</td>
                    <td className="px-4 py-3">{row.balanceAfter ?? ""}</td>
                    <td className="px-4 py-3">{row.description}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      {can("accounting.create") &&
                      !row.reference.startsWith("REVERSAL:") ? (
                        <button
                          type="button"
                          className="text-[#16324f] underline"
                          onClick={() => {
                            setMode("reversal");
                            setSelectedCustomer({
                              id: row.userId,
                              label: row.userId,
                            });
                            setForm((f) => ({
                              ...f,
                              originalReference: row.reference,
                              note: "",
                            }));
                            setFormError(null);
                          }}
                        >
                          Ters kayıt
                        </button>
                      ) : null}
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
