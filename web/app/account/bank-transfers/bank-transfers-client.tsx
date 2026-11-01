"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { clientApiFetch } from "@/lib/api/client";
import { resolveBankBrand } from "@/lib/bank-brand";
import { bankTransferClaimUiState } from "@/lib/bank-transfer-claim";
import { formatMoney, toApiMoneyAmount } from "@/lib/money";
import type { Paginated } from "@/types/api";

type Transfer = {
  id: string;
  orderId?: string;
  status: string;
  amount: string;
  remainingAmount?: string;
  approvedTotal?: string;
  paymentStatus?: string;
  referenceNumber: string | null;
  bankName?: string | null;
  createdAt: string;
};

type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  branch?: string | null;
};

type OrderPayment = {
  id: string;
  status: string;
  method?: string;
  amount: string;
  remainingAmount?: string;
  approvedTotal?: string;
  paymentReference?: string | null;
  pendingBankTransferId?: string | null;
  pendingBankTransferAmount?: string | null;
  pendingBankTransferBankName?: string | null;
  pendingBankTransferReference?: string | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  currency: string;
  totalAmount: string;
  payment: OrderPayment | null;
};

function statusTone(
  status: string,
): "warning" | "success" | "danger" | "neutral" {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "İnceleniyor";
    case "APPROVED":
      return "Onaylandı";
    case "REJECTED":
      return "Reddedildi";
    default:
      return status;
  }
}

function BankCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-slate-200 bg-white p-4"
      aria-hidden
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-[66%] rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="mt-3 h-11 w-28 rounded bg-slate-100" />
    </div>
  );
}

export default function BankTransfersClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const bankAccountIdParam = searchParams.get("bankAccountId") ?? "";
  const queryClient = useQueryClient();
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["bank-transfers"],
    queryFn: () =>
      clientApiFetch<Paginated<Transfer>>("/bank-transfers?page=1&limit=50"),
  });
  const banks = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => clientApiFetch<BankAccount[]>("/payment/bank-accounts"),
  });
  const order = useQuery({
    queryKey: ["order-for-transfer", orderId],
    queryFn: () => clientApiFetch<OrderDetail>(`/orders/${orderId}`),
    enabled: Boolean(orderId),
  });

  const currency = order.data?.currency ?? "TRY";
  const payment = order.data?.payment ?? null;
  const remaining =
    payment?.remainingAmount ?? order.data?.totalAmount ?? "";
  const approved = payment?.approvedTotal ?? "0.00";
  const paymentReference = payment?.paymentReference ?? "";
  const selectedBank =
    (banks.data ?? []).find((b) => b.id === selectedBankId) ?? null;

  const claimState = bankTransferClaimUiState({
    paymentMethod: payment?.method ?? "BANK_TRANSFER",
    paymentStatus: payment?.status,
    remainingAmount: remaining,
    pendingBankTransferId: payment?.pendingBankTransferId,
  });
  const isPendingReview = claimState === "pending_review";
  const canSubmit = claimState === "can_claim" && Boolean(selectedBankId);

  const pendingFromList = (list.data?.items ?? []).find(
    (item) =>
      item.status === "PENDING" &&
      (!orderId || item.orderId === orderId) &&
      (!payment?.pendingBankTransferId ||
        item.id === payment.pendingBankTransferId),
  );
  const pendingAmount =
    payment?.pendingBankTransferAmount ?? pendingFromList?.amount ?? null;
  const pendingBankName =
    payment?.pendingBankTransferBankName ?? pendingFromList?.bankName ?? null;
  const pendingReference =
    payment?.pendingBankTransferReference ??
    pendingFromList?.referenceNumber ??
    paymentReference ??
    null;

  useEffect(() => {
    if (remaining && !isPendingReview) {
      setAmountInput(remaining);
    }
  }, [remaining, isPendingReview]);

  useEffect(() => {
    if (!bankAccountIdParam || !banks.data?.length || isPendingReview) return;
    if (banks.data.some((b) => b.id === bankAccountIdParam)) {
      setSelectedBankId(bankAccountIdParam);
    }
  }, [bankAccountIdParam, banks.data, isPendingReview]);

  const create = useMutation({
    mutationFn: () => {
      if (claimState !== "can_claim") {
        throw new Error("Ödeme bildiriminiz inceleniyor");
      }
      if (!selectedBankId) {
        throw new Error("Lütfen bir banka hesabı seçin");
      }
      const amount = toApiMoneyAmount(amountInput);
      if (!amount) {
        throw new Error("Geçerli bir tutar girin (0'dan büyük)");
      }
      if (remaining && Number(amount) > Number(remaining)) {
        throw new Error(
          `Tutar kalan bakiyeyi aşamaz (${formatMoney(remaining, currency)})`,
        );
      }
      return clientApiFetch(`/orders/${orderId}/bank-transfer`, {
        method: "POST",
        body: JSON.stringify({
          bankAccountId: selectedBankId,
          amount,
        }),
      });
    },
    onSuccess: () => {
      setError(null);
      setSuccess(
        "Ödeme bildiriminiz alındı. Onay sonrası bakiyeniz güncellenir.",
      );
      queryClient.invalidateQueries({ queryKey: ["bank-transfers"] });
      queryClient.invalidateQueries({
        queryKey: ["order-for-transfer", orderId],
      });
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message);
    },
  });

  const claimAmountApi = toApiMoneyAmount(amountInput);
  const formDisabled = isPendingReview || create.isPending;

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
        Havale / EFT ile Öde
      </h1>

      {orderId ? (
        <div className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
          {order.isLoading ? (
            <div className="animate-pulse space-y-3" aria-busy="true">
              <div className="h-4 w-48 rounded bg-slate-200" />
              <div className="h-20 rounded bg-slate-100" />
            </div>
          ) : null}

          {order.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-medium">Sipariş bilgileri yüklenemedi.</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 min-h-11"
                onClick={() => void order.refetch()}
              >
                Tekrar dene
              </Button>
            </div>
          ) : null}

          {order.data && claimState !== "hidden" ? (
            <>
              <p className="text-sm text-slate-600">
                Sipariş:{" "}
                <strong className="text-navy">{order.data.orderNumber}</strong>
              </p>

              {isPendingReview ? (
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                  role="status"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">İnceleniyor</Badge>
                    <p className="font-semibold">
                      Ödeme bildiriminiz inceleniyor
                    </p>
                  </div>
                  <p className="mt-1 text-amber-900/80">
                    İnceleme tamamlanana kadar yeni bildirim gönderemezsiniz.
                  </p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded border bg-white px-3 py-2">
                      <dt className="text-xs text-slate-500">Bildirilen tutar</dt>
                      <dd className="font-medium">
                        {pendingAmount
                          ? formatMoney(pendingAmount, currency)
                          : "—"}
                      </dd>
                    </div>
                    <div className="rounded border bg-white px-3 py-2">
                      <dt className="text-xs text-slate-500">Banka</dt>
                      <dd className="font-medium">{pendingBankName || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2">
                      <div>
                        <dt className="text-xs text-slate-500">Referans</dt>
                        <dd className="font-mono text-xs">
                          {pendingReference || "—"}
                        </dd>
                      </div>
                      {pendingReference ? (
                        <CopyButton
                          value={pendingReference}
                          label="Kopyala"
                        />
                      ) : null}
                    </div>
                  </dl>
                </div>
              ) : null}

              <div>
                <h2 className="mb-2 text-sm font-semibold text-navy">
                  Banka hesapları
                </h2>
                {banks.isLoading ? (
                  <div
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    aria-busy="true"
                    aria-label="Banka hesapları yükleniyor"
                  >
                    <BankCardSkeleton />
                    <BankCardSkeleton />
                    <BankCardSkeleton />
                  </div>
                ) : null}

                {banks.isError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-medium">
                      Banka hesapları yüklenemedi. Lütfen tekrar deneyin.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3 min-h-11"
                      onClick={() => void banks.refetch()}
                    >
                      Tekrar dene
                    </Button>
                  </div>
                ) : null}

                {!banks.isLoading &&
                !banks.isError &&
                (banks.data?.length ?? 0) === 0 ? (
                  <EmptyState
                    title="Aktif banka hesabı yok"
                    description="Şu an havale için gösterilecek şirket hesabı bulunmuyor. Lütfen daha sonra tekrar deneyin."
                  />
                ) : null}

                {!banks.isLoading && !banks.isError && banks.data?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {banks.data.map((bank) => {
                      const selected = selectedBankId === bank.id;
                      const brand = resolveBankBrand(bank.bankName);
                      return (
                        <button
                          key={bank.id}
                          type="button"
                          disabled={formDisabled}
                          aria-pressed={selected}
                          aria-label={`${bank.bankName} hesabını seç`}
                          onClick={() => setSelectedBankId(bank.id)}
                          className={`min-h-[11rem] rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-[#1b6b8f] bg-[#1b6b8f]/5 shadow-sm ring-2 ring-[#1b6b8f]"
                              : "border-slate-200 bg-white hover:border-[#1b6b8f]/40 hover:shadow-sm"
                          }`}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                selected
                                  ? "bg-[#1b6b8f] text-white"
                                  : `${brand.bgClass} ${brand.textClass}`
                              }`}
                              aria-hidden
                            >
                              {brand.initials}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-navy">
                                {bank.bankName}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {bank.accountName}
                              </p>
                            </div>
                          </div>
                          <p className="break-all font-mono text-sm text-slate-800">
                            {bank.iban}
                          </p>
                          {bank.branch ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Şube: {bank.branch}
                            </p>
                          ) : null}
                          <div
                            className="mt-3"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <CopyButton
                              value={bank.iban}
                              label="IBAN'ı Kopyala"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <p className="text-sm text-slate-600">
                Listelenen hesaplardan herhangi birine, kendi bankanızdan
                EFT/havale yapabilirsiniz.
              </p>

              {selectedBank || isPendingReview ? (
                <div className="rounded-lg border border-[#1b6b8f]/30 bg-[#1b6b8f]/5 p-4 text-sm">
                  {selectedBank ? (
                    <>
                      <p className="font-semibold text-[#1b6b8f]">
                        Seçilen hesap
                      </p>
                      <p>
                        {selectedBank.bankName} · {selectedBank.accountName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="font-mono break-all">
                          {selectedBank.iban}
                        </p>
                        <CopyButton
                          value={selectedBank.iban}
                          label="IBAN'ı Kopyala"
                        />
                      </div>
                    </>
                  ) : null}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded border bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">Sipariş toplamı</p>
                      <p className="font-medium">
                        {formatMoney(order.data.totalAmount, currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2">
                      <div>
                        <p className="text-xs text-slate-500">Ödenen</p>
                        <p className="font-medium">
                          {formatMoney(approved, currency)}
                        </p>
                      </div>
                      <CopyButton value={approved} label="Kopyala" />
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2">
                      <div>
                        <p className="text-xs text-slate-500">Kalan</p>
                        <p className="font-medium">
                          {remaining
                            ? formatMoney(remaining, currency)
                            : "—"}
                        </p>
                      </div>
                      {remaining ? (
                        <CopyButton value={remaining} label="Kopyala" />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2">
                      <div>
                        <p className="text-xs text-slate-500">Ödeme referansı</p>
                        <p className="font-mono text-xs">
                          {paymentReference || "—"}
                        </p>
                      </div>
                      {paymentReference ? (
                        <CopyButton
                          value={paymentReference}
                          label="Kopyala"
                        />
                      ) : null}
                    </div>
                  </div>

                  {!isPendingReview ? (
                    <div className="mt-4 rounded border bg-white p-3">
                      <label
                        htmlFor="claim-amount"
                        className="mb-1 block text-xs font-medium text-slate-600"
                      >
                        Ödeme tutarı
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id="claim-amount"
                          inputMode="decimal"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          placeholder={remaining || "0.00"}
                          className="max-w-xs min-h-11 font-mono"
                          disabled={formDisabled}
                        />
                        {claimAmountApi ? (
                          <CopyButton
                            value={claimAmountApi}
                            label="Tutarı Kopyala"
                          />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Varsayılan kalan tutar:{" "}
                        {remaining ? formatMoney(remaining, currency) : "—"}
                        {claimAmountApi
                          ? ` · Bildirilecek: ${formatMoney(claimAmountApi, currency)}`
                          : ""}
                      </p>
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs text-slate-600">
                    Havale açıklamasına ödeme referansını yazın. Onaylanmadan
                    ödeme tamamlanmış sayılmaz.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-amber-800">
                  Ödemeyi bildirmek için bir banka hesabı seçin.
                </p>
              )}

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="text-sm text-emerald-700" role="status">
                  {success}
                </p>
              ) : null}

              <Button
                type="button"
                disabled={!canSubmit || create.isPending}
                onClick={() => create.mutate()}
                className="min-h-11 bg-[#1b6b8f] hover:bg-[#16324f]"
                aria-busy={create.isPending}
              >
                {create.isPending
                  ? "Gönderiliyor…"
                  : isPendingReview
                    ? "İnceleniyor"
                    : "Ödemeyi Yaptım"}
              </Button>
            </>
          ) : null}

          {order.data && claimState === "hidden" ? (
            <p className="text-sm text-slate-600">
              Bu sipariş için yeni havale bildirimi gerekmiyor.
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-lg font-semibold text-navy">
          Bildirim geçmişi
        </h2>
        {list.isLoading ? (
          <div className="animate-pulse space-y-2" aria-busy="true">
            <div className="h-16 rounded border bg-slate-100" />
            <div className="h-16 rounded border bg-slate-100" />
          </div>
        ) : null}
        {list.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>Bildirim geçmişi yüklenemedi.</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 min-h-11"
              onClick={() => void list.refetch()}
            >
              Tekrar dene
            </Button>
          </div>
        ) : null}
        {!list.isLoading && !list.isError && !list.data?.items.length ? (
          <EmptyState
            title="Havale bildirimi yok"
            description="Ödeme bildirimleriniz onay veya red sonrası burada listelenir."
          />
        ) : null}
        {list.data?.items.length ? (
          <ul className="space-y-2">
            {list.data.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={statusTone(item.status)}>
                    {statusLabel(item.status)}
                  </Badge>
                  <span className="font-medium">
                    {formatMoney(item.amount, currency)}
                  </span>
                </div>
                <p className="mt-2 text-slate-500">
                  {item.bankName ?? "—"} · {item.referenceNumber ?? "—"} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
