"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { paymentStatusLabel } from "@/lib/order-labels";

export type SuccessBankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  branch?: string | null;
};

export type SuccessOrder = {
  id: string;
  orderNumber: string;
  totalAmount: string;
  currency: string;
  status: string;
  payment: {
    status: string;
    method: string;
    amount: string;
    approvedTotal?: string;
    remainingAmount?: string;
    paymentReference?: string | null;
  } | null;
};

function bankInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Kopyalandı" : label}
    </button>
  );
}

export function CheckoutSuccessClient({
  order,
  banks,
  initialBankAccountId,
}: {
  order: SuccessOrder | null;
  banks: SuccessBankAccount[];
  initialBankAccountId?: string;
}) {
  const currency = order?.currency ?? "TRY";
  const [selectedBankId, setSelectedBankId] = useState(
    initialBankAccountId && banks.some((b) => b.id === initialBankAccountId)
      ? initialBankAccountId
      : (banks[0]?.id ?? ""),
  );

  const selectedBank = useMemo(
    () => banks.find((b) => b.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  );

  const remaining =
    order?.payment?.remainingAmount ?? order?.totalAmount ?? "";
  const approved = order?.payment?.approvedTotal ?? "0.00";
  const paymentReference = order?.payment?.paymentReference ?? "";
  const canPay =
    Boolean(order?.id) &&
    order?.payment?.method === "BANK_TRANSFER" &&
    (order.payment.status === "PENDING" ||
      order.payment.status === "PARTIALLY_PAID");

  const claimHref = order
    ? `/account/bank-transfers?orderId=${encodeURIComponent(order.id)}${
        selectedBankId
          ? `&bankAccountId=${encodeURIComponent(selectedBankId)}`
          : ""
      }`
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-xl border bg-white p-8">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Siparişiniz oluşturuldu.
        </h1>
        {order ? (
          <div className="mt-4 space-y-1 text-sm text-slate-700">
            <p>
              Sipariş no: <strong>{order.orderNumber}</strong>
            </p>
            <p>Ödeme yöntemi: Havale / EFT</p>
            <p>
              Ödeme durumu: {paymentStatusLabel(order.payment?.status)}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-700">
            Sipariş bilgisi yüklenemedi. Hesabınızdaki siparişlerden devam
            edebilirsiniz.
          </p>
        )}
      </div>

      {order ? (
        <div className="grid gap-2 text-left text-sm sm:grid-cols-2">
          <div className="rounded border bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Sipariş toplamı</p>
            <p className="font-medium">
              {formatMoney(order.totalAmount, currency)}
            </p>
          </div>
          <div className="rounded border bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Ödenen</p>
            <p className="font-medium">{formatMoney(approved, currency)}</p>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border bg-slate-50 px-3 py-2">
            <div>
              <p className="text-xs text-slate-500">Kalan / Ödenecek</p>
              <p className="font-medium">
                {remaining ? formatMoney(remaining, currency) : "—"}
              </p>
            </div>
            {remaining ? (
              <CopyButton value={remaining} label="Kopyala" />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 rounded border bg-slate-50 px-3 py-2">
            <div>
              <p className="text-xs text-slate-500">Ödeme referansı</p>
              <p className="font-mono text-xs break-all">
                {paymentReference || "—"}
              </p>
            </div>
            {paymentReference ? (
              <CopyButton value={paymentReference} label="Kopyala" />
            ) : null}
          </div>
        </div>
      ) : null}

      {banks.length > 0 ? (
        <div className="space-y-3 text-left">
          <p className="text-sm font-semibold text-navy">Banka hesapları</p>
          <p className="text-xs text-slate-600">
            Listelenen hesaplardan herhangi birine kendi bankanızdan EFT/havale
            yapabilirsiniz.
          </p>
          <div className="grid gap-3">
            {banks.map((bank) => {
              const selected = selectedBankId === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setSelectedBankId(bank.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected
                      ? "border-[#1b6b8f] bg-[#1b6b8f]/5 ring-2 ring-[#1b6b8f]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                        selected
                          ? "bg-[#1b6b8f] text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {bankInitials(bank.bankName)}
                    </span>
                    <div>
                      <p className="font-semibold text-navy">{bank.bankName}</p>
                      <p className="text-xs text-slate-500">{bank.accountName}</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm break-all">{bank.iban}</p>
                  <div
                    className="mt-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <CopyButton value={bank.iban} label="IBAN'ı Kopyala" />
                  </div>
                </button>
              );
            })}
          </div>

          {selectedBank ? (
            <div className="rounded-md border border-[#1b6b8f]/30 bg-[#1b6b8f]/5 p-3 text-sm">
              <p className="font-semibold text-[#1b6b8f]">Seçilen hesap</p>
              <p>
                {selectedBank.bankName} · {selectedBank.accountName}
              </p>
              <p className="font-mono text-xs break-all">{selectedBank.iban}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-amber-700">
          Aktif banka hesabı bulunamadı.
        </p>
      )}

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
        {canPay && claimHref ? (
          <Link
            href={claimHref}
            className="inline-flex items-center justify-center rounded-md bg-[#1b6b8f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16324f]"
          >
            Ödemeyi Yaptım
          </Link>
        ) : null}
        {order ? (
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-sm font-semibold"
          >
            Siparişi Görüntüle
          </Link>
        ) : null}
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-sm font-semibold"
        >
          Alışverişe Devam Et
        </Link>
      </div>

      {canPay ? (
        <p className="text-center text-xs text-slate-500">
          Havale/EFT sonrası &quot;Ödemeyi Yaptım&quot; ile bildiriminizi
          gönderin. Kısmi ödeme tutarı bir sonraki ekranda düzenlenebilir.
        </p>
      ) : null}
    </div>
  );
}
