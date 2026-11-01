import { notFound } from "next/navigation";
import { CancelOrderButton } from "@/components/account/cancel-order-button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { serverApiFetch } from "@/lib/api/server";
import { formatMoney } from "@/lib/money";
import {
  orderStatusLabel,
  orderStatusTone,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  shippingProviderLabel,
  shippingStatusLabel,
} from "@/lib/order-labels";

type Props = { params: Promise<{ id: string }> };

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  canCancel: boolean;
  allowedTransitions: string[];
  payment: {
    status: string;
    method: string;
    amount: string;
    approvedTotal?: string;
    remainingAmount?: string;
    paymentReference?: string | null;
    pendingBankTransferId?: string | null;
  } | null;
  shipping: {
    provider: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    totalAmount: string;
  }>;
  statusHistory: Array<{
    id: string;
    toStatus: string;
    createdAt: string;
    note: string | null;
  }>;
  shippingAddress?: Record<string, string>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  let order: Order;
  try {
    order = await serverApiFetch<Order>(`/orders/${id}`);
  } catch {
    notFound();
  }

  const currency = order.currency;
  const isBankTransfer = order.payment?.method === "BANK_TRANSFER";
  const remaining = order.payment?.remainingAmount;
  const approved = order.payment?.approvedTotal;
  const canPayBankTransfer =
    isBankTransfer &&
    (order.payment?.status === "PENDING" ||
      order.payment?.status === "PARTIALLY_PAID") &&
    Number(remaining ?? order.payment?.amount) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          {order.orderNumber}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={orderStatusTone(order.status)}>
            {orderStatusLabel(order.status)}
          </Badge>
          <Badge tone={paymentStatusTone(order.payment?.status)}>
            {paymentStatusLabel(order.payment?.status)}
          </Badge>
          <span className="text-slate-500">
            {new Date(order.createdAt).toLocaleString("tr-TR")}
          </span>
        </div>
        {canPayBankTransfer ? (
          <a
            href={`/account/bank-transfers?orderId=${order.id}`}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
          >
            {order.payment?.pendingBankTransferId
              ? "Ödeme bildiriminiz inceleniyor"
              : "Havale / EFT ile Öde"}
            {remaining
              ? ` · Kalan ${formatMoney(remaining, currency)}`
              : ""}
          </a>
        ) : null}
        {order.canCancel ? (
          <div className="mt-4">
            <CancelOrderButton orderId={order.id} />
          </div>
        ) : null}
      </div>

      {isBankTransfer && order.payment ? (
        <section className="rounded-lg border bg-white p-4 text-sm">
          <h2 className="font-semibold text-navy">Havale / EFT ödeme</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Ödeme durumu</dt>
              <dd className="mt-0.5 font-medium">
                {paymentStatusLabel(order.payment.status)}
                {order.payment.status === "PARTIALLY_PAID" ? (
                  <span className="ml-2 inline-flex">
                    <Badge tone="warning">Kısmi ödeme</Badge>
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Sipariş tutarı</dt>
              <dd className="mt-0.5 font-medium">
                {formatMoney(order.payment.amount, currency)}
              </dd>
            </div>
            {approved != null ? (
              <div>
                <dt className="text-xs text-slate-500">Ödenen</dt>
                <dd className="mt-0.5 font-medium">
                  {formatMoney(approved, currency)}
                </dd>
              </div>
            ) : null}
            {remaining != null &&
            (order.payment.status === "PENDING" ||
              order.payment.status === "PARTIALLY_PAID") ? (
              <div>
                <dt className="text-xs text-slate-500">Kalan</dt>
                <dd className="mt-0.5 font-medium">
                  {formatMoney(remaining, currency)}
                </dd>
              </div>
            ) : null}
            {order.payment.paymentReference ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Ödeme referansı</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm">
                    {order.payment.paymentReference}
                  </span>
                  <CopyButton
                    value={order.payment.paymentReference}
                    label="Referansı Kopyala"
                  />
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Ürünler</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-4">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>{formatMoney(item.totalAmount, currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t pt-3 font-semibold">
          Toplam: {formatMoney(order.totalAmount, currency)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Ödeme: {paymentMethodLabel(order.payment?.method)} ·{" "}
          {paymentStatusLabel(order.payment?.status)}
        </p>
      </section>

      {order.shipping ? (
        <section className="rounded-lg border bg-white p-4 text-sm">
          <h2 className="font-semibold">Kargo</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-slate-500">Firma:</dt>
              <dd>{shippingProviderLabel(order.shipping.provider)}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-slate-500">Durum:</dt>
              <dd>{shippingStatusLabel(order.shipping.status)}</dd>
            </div>
            {order.shipping.trackingNumber ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-slate-500">Takip no:</dt>
                <dd className="font-medium">{order.shipping.trackingNumber}</dd>
              </div>
            ) : null}
            {order.shipping.shippedAt ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-slate-500">Kargoya verildi:</dt>
                <dd>
                  {new Date(order.shipping.shippedAt).toLocaleString("tr-TR")}
                </dd>
              </div>
            ) : null}
            {order.shipping.deliveredAt ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-slate-500">Teslim:</dt>
                <dd>
                  {new Date(order.shipping.deliveredAt).toLocaleString(
                    "tr-TR",
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
          {order.shipping.trackingUrl ? (
            <a
              href={order.shipping.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark hover:text-white"
            >
              Kargoyu Takip Et
            </a>
          ) : null}
        </section>
      ) : null}

      {order.shippingAddress ? (
        <section className="rounded-lg border bg-white p-4 text-sm">
          <h2 className="font-semibold">Teslimat adresi</h2>
          <p className="mt-2">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          </p>
          <p>{order.shippingAddress.addressLine}</p>
          <p>
            {order.shippingAddress.district}/{order.shippingAddress.city}
          </p>
        </section>
      ) : null}

      {order.statusHistory.length > 0 ? (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold">Sipariş geçmişi</h2>
          <ol className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
            {order.statusHistory.map((event) => (
              <li key={event.id}>
                <p className="font-medium">
                  {orderStatusLabel(event.toStatus)}
                </p>
                <p className="text-slate-500">
                  {new Date(event.createdAt).toLocaleString("tr-TR")}
                </p>
                {event.note ? (
                  <p className="mt-0.5 text-slate-600">{event.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
