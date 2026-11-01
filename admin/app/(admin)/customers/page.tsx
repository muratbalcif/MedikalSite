"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userStatusLabel, userTypeLabel } from "@/lib/enum-labels";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError, apiDownloadText } from "@/lib/api-client";
import { parseCustomerImportCsv } from "@/lib/customer-import";
import { customersAdminService } from "@/services/admin-api.service";

const FILTERS = [
  { value: "", label: "Tümü" },
  { value: "INDIVIDUAL", label: "Bireysel" },
  { value: "CORPORATE", label: "Kurumsal" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Pasif" },
  { value: "DEBTOR", label: "Borçlu" },
  { value: "CREDITOR", label: "Alacaklı" },
] as const;

const EMPTY_INVITE = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  companyName: "",
  taxNumber: "",
  taxOffice: "",
  allowCredit: false,
  creditLimit: "",
  paymentTermDays: "0",
};

export default function CustomersPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const canInvite = can("customer.update");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [importCsv, setImportCsv] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-customers", page, search, filter],
    queryFn: () =>
      customersAdminService.list(page, 20, {
        search: search || undefined,
        filter: filter || undefined,
      }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (
        !inviteForm.email.trim() ||
        !inviteForm.firstName.trim() ||
        !inviteForm.lastName.trim() ||
        !inviteForm.companyName.trim() ||
        !inviteForm.taxNumber.trim() ||
        !inviteForm.taxOffice.trim()
      ) {
        throw new Error("Zorunlu alanları doldurun");
      }
      return customersAdminService.invite({
        email: inviteForm.email.trim(),
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        phone: inviteForm.phone.trim() || undefined,
        companyName: inviteForm.companyName.trim(),
        taxNumber: inviteForm.taxNumber.trim(),
        taxOffice: inviteForm.taxOffice.trim(),
        allowCredit: inviteForm.allowCredit,
        creditLimit: inviteForm.creditLimit.trim() || undefined,
        paymentTermDays: Number(inviteForm.paymentTermDays) || 0,
      });
    },
    onSuccess: (created) => {
      setInviteError(null);
      setInviteSuccess(
        created?.email
          ? `${created.email} davet edildi. Aktivasyon e-postası kuyruğa alındı.`
          : "Müşteri davet edildi.",
      );
      setInviteForm(EMPTY_INVITE);
      setShowInvite(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: Error) => {
      setInviteSuccess(null);
      setInviteError(
        err instanceof ApiError
          ? err.message
          : err.message || "Davet başarısız",
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: () => {
      const rows = parseCustomerImportCsv(importCsv);
      if (rows.length === 0) {
        throw new Error(
          "Geçerli satır yok. firstName,lastName,email zorunlu.",
        );
      }
      return customersAdminService.importRows(rows);
    },
    onSuccess: (res) => {
      setImportError(null);
      const created =
        res.results?.filter((r) => r.status === "created").length ?? 0;
      const skipped =
        res.results?.filter((r) => r.status === "skipped").length ?? 0;
      const errored =
        res.results?.filter((r) => r.status === "error").length ?? 0;
      setImportResult(
        `Import tamamlandı: ${created} oluşturuldu, ${skipped} atlandı, ${errored} hata.`,
      );
      setImportCsv("");
      void queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: Error) => {
      setImportResult(null);
      setImportError(
        err instanceof ApiError ? err.message : err.message || "Import başarısız",
      );
    },
  });

  return (
    <ModulePage permission="customer.read">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Müşteriler
            </h1>
            <p className="text-sm text-slate-500">
              Server-side arama ve filtre. Bakiye ledger aggregate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canInvite ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setInviteError(null);
                    setShowImport(false);
                    setShowInvite((v) => !v);
                  }}
                  className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
                >
                  {showInvite ? "Daveti kapat" : "Kurumsal davet"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportError(null);
                    setShowInvite(false);
                    setShowImport((v) => !v);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {showImport ? "Import kapat" : "CSV Import"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void apiDownloadText(
                  customersAdminService.exportUrl({
                    search: search || undefined,
                    filter: filter || undefined,
                  }),
                  "customers.csv",
                );
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              CSV Export
            </button>
          </div>
        </div>

        {inviteSuccess ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {inviteSuccess}
          </p>
        ) : null}
        {importResult ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {importResult}
          </p>
        ) : null}

        {showImport && canInvite ? (
          <form
            className="space-y-2 rounded-xl border bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setImportError(null);
              setImportResult(null);
              importMutation.mutate();
            }}
          >
            <p className="text-sm font-medium text-slate-700">
              Müşteri CSV import
            </p>
            <p className="text-xs text-slate-500">
              Kolonlar: firstName,lastName,email,phone,userType,companyName,taxNumber,taxOffice
              — kurumsal için company/tax alanları zorunlu. Şifre gönderilmez;
              aktivasyon e-postası kuyruğa alınır.
            </p>
            <textarea
              required
              rows={8}
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
              placeholder={
                "firstName,lastName,email,phone,userType,companyName,taxNumber,taxOffice\nAli,Yılmaz,ali@example.com,555,CORPORATE,ACME,123,Kadıköy"
              }
              className="w-full rounded border px-3 py-2 font-mono text-xs"
            />
            {importError ? (
              <p className="text-sm text-red-600">{importError}</p>
            ) : null}
            <button
              type="submit"
              disabled={importMutation.isPending}
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {importMutation.isPending ? "İçe aktarılıyor…" : "Import et"}
            </button>
          </form>
        ) : null}

        {showInvite && canInvite ? (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setInviteError(null);
              setInviteSuccess(null);
              inviteMutation.mutate();
            }}
          >
            <p className="sm:col-span-2 text-sm font-medium text-slate-700">
              Kurumsal müşteri davet et
            </p>
            <input
              className="rounded border px-3 py-2 text-sm"
              type="email"
              required
              placeholder="E-posta"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Telefon"
              value={inviteForm.phone}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              required
              placeholder="Ad"
              value={inviteForm.firstName}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, firstName: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              required
              placeholder="Soyad"
              value={inviteForm.lastName}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm sm:col-span-2"
              required
              placeholder="Firma adı"
              value={inviteForm.companyName}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, companyName: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              required
              placeholder="Vergi no"
              value={inviteForm.taxNumber}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, taxNumber: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              required
              placeholder="Vergi dairesi"
              value={inviteForm.taxOffice}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, taxOffice: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Kredi limiti"
              value={inviteForm.creditLimit}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, creditLimit: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Vade (gün)"
              value={inviteForm.paymentTermDays}
              onChange={(e) =>
                setInviteForm((f) => ({
                  ...f,
                  paymentTermDays: e.target.value,
                }))
              }
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={inviteForm.allowCredit}
                onChange={(e) =>
                  setInviteForm((f) => ({
                    ...f,
                    allowCredit: e.target.checked,
                  }))
                }
              />
              Cari kredi açık
            </label>
            {inviteError ? (
              <p className="text-sm text-red-600 sm:col-span-2">{inviteError}</p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {inviteMutation.isPending ? "Gönderiliyor…" : "Davet gönder"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="İsim, e-posta, telefon, firma, vergi no…"
            className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => {
              setPage(1);
              setFilter(e.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {FILTERS.map((f) => (
              <option key={f.value || "all"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Müşteri listesi alınamadı.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Ad Soyad</th>
                  <th className="px-3 py-2 font-medium">E-posta</th>
                  <th className="px-3 py-2 font-medium">Telefon</th>
                  <th className="px-3 py-2 font-medium">Tip</th>
                  <th className="px-3 py-2 font-medium">Firma</th>
                  <th className="px-3 py-2 font-medium">Bakiye</th>
                  <th className="px-3 py-2 font-medium">Sipariş</th>
                  <th className="px-3 py-2 font-medium">Toplam</th>
                  <th className="px-3 py-2 font-medium">Durum</th>
                  <th className="px-3 py-2 font-medium">Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-[#16324f] hover:underline"
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{c.email}</td>
                    <td className="px-3 py-2">{c.phone ?? "—"}</td>
                    <td className="px-3 py-2">{userTypeLabel(c.userType)}</td>
                    <td className="px-3 py-2">{c.companyName ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{c.balance}</td>
                    <td className="px-3 py-2">{c.orderCount}</td>
                    <td className="px-3 py-2">{c.totalSpent}</td>
                    <td className="px-3 py-2">{userStatusLabel(c.status)}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <span>Toplam: {data?.meta.total ?? 0}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border px-2 py-1 disabled:opacity-40"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  disabled={(data?.meta.totalPages ?? 1) <= page}
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
