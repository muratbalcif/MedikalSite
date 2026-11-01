"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { ApiError } from "@/lib/api-client";
import {
  catalogService,
  customersAdminService,
  salesService,
  type AdminProduct,
  type SalePaymentMethod,
} from "@/services/admin-api.service";

type CartLine = {
  productId: string;
  name: string;
  sku: string;
  unitPrice: string;
  quantity: number;
  discountAmount: number;
};

function money(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return `${value} ₺`;
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}

function lineGross(line: CartLine): number {
  return Number(line.unitPrice) * line.quantity;
}

function lineNet(line: CartLine): number {
  return Math.max(0, lineGross(line) - line.discountAmount);
}

export default function NewSalePage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<SalePaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedProductSearch(productSearch.trim()),
      250,
    );
    return () => clearTimeout(t);
  }, [productSearch]);

  const customersQuery = useQuery({
    queryKey: ["admin-sale-customer-search", customerSearch],
    queryFn: () =>
      customersAdminService.list(1, 20, {
        search: customerSearch.trim() || undefined,
      }),
  });

  const productsQuery = useQuery({
    queryKey: ["admin-sale-product-search", debouncedProductSearch],
    queryFn: () =>
      catalogService.listProducts(1, 15, {
        search: debouncedProductSearch || undefined,
        active: true,
      }),
    enabled: debouncedProductSearch.length >= 1,
  });

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + lineNet(l), 0);
    const discount = cart.reduce((s, l) => s + l.discountAmount, 0);
    return { subtotal, discount, total: subtotal };
  }, [cart]);

  const addProduct = (product: AdminProduct) => {
    const price = product.price?.amount ?? "0";
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: price,
          quantity: 1,
          discountAmount: 0,
        },
      ];
    });
    setProductSearch("");
    setDebouncedProductSearch("");
  };

  const updateQty = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.max(0, quantity) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const updateDiscount = (productId: string, discountAmount: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, discountAmount: Math.max(0, discountAmount) }
          : l,
      ),
    );
  };

  const createMutation = useMutation({
    mutationFn: () =>
      salesService.create({
        customerId: customerId || null,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          discountAmount: l.discountAmount || undefined,
        })),
        paymentMethod,
        note: note.trim() || undefined,
      }),
    onSuccess: (sale) => {
      router.push(`/sales/${sale.id}`);
    },
    onError: (err: Error) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err.message || "Satış oluşturulamadı",
      );
      setConfirmOpen(false);
    },
  });

  const selectedCustomer = (customersQuery.data?.items ?? []).find(
    (c) => c.id === customerId,
  );

  return (
    <ModulePage permission="sale.create">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
              Yeni Satış
            </h1>
            <p className="text-sm text-slate-500">
              Müşteri seçimi opsiyonel — seçilmezse perakende satış olur.
            </p>
          </div>
          <Link href="/sales" className="text-sm text-[#1b6b8f] underline">
            ← Satışlar
          </Link>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Müşteri{" "}
              <span className="font-normal text-slate-400">(opsiyonel)</span>
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Müşteri ara…"
                className="min-w-[12rem] flex-1 rounded-md border px-3 py-2 text-sm"
              />
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="min-w-[14rem] flex-1 rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Müşteri seçiniz… (opsiyonel)</option>
                {(customersQuery.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.firstName} ${c.lastName}`.trim() || c.email}
                  </option>
                ))}
              </select>
              {customerId ? (
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm"
                  onClick={() => setCustomerId("")}
                >
                  Temizle
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {customerId
                ? `Seçili: ${
                    selectedCustomer
                      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() ||
                        selectedCustomer.email
                      : customerId
                  }`
                : "Müşteri seçilmedi → Perakende Satış"}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Ürün</label>
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Ürün / SKU ara…"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              autoFocus
            />
            {debouncedProductSearch && productsQuery.data ? (
              <ul className="mt-2 max-h-48 overflow-auto rounded-md border divide-y">
                {productsQuery.data.items.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-500">
                    Ürün bulunamadı
                  </li>
                ) : (
                  productsQuery.data.items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => addProduct(p)}
                      >
                        <span>
                          <span className="font-medium">{p.name}</span>
                          <span className="ml-2 font-mono text-xs text-slate-500">
                            {p.sku}
                          </span>
                        </span>
                        <span className="tabular-nums text-slate-600">
                          {p.price ? money(p.price.amount) : "—"}
                          {p.stock?.availableQuantity != null
                            ? ` · stok ${p.stock.availableQuantity}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Sepet</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-500">
              Sepet boş. Ürün / SKU arayarak ekleyin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ürün</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Birim Fiyat</th>
                    <th className="px-3 py-2 font-medium">Adet</th>
                    <th className="px-3 py-2 font-medium">İndirim</th>
                    <th className="px-3 py-2 font-medium">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.productId} className="border-t">
                      <td className="px-3 py-2">{line.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {line.sku}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {money(line.unitPrice)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded border px-2"
                            onClick={() =>
                              updateQty(line.productId, line.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateQty(
                                line.productId,
                                Number(e.target.value) || 1,
                              )
                            }
                            className="w-14 rounded border px-1 py-0.5 text-center"
                          />
                          <button
                            type="button"
                            className="rounded border px-2"
                            onClick={() =>
                              updateQty(line.productId, line.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.discountAmount}
                          onChange={(e) =>
                            updateDiscount(
                              line.productId,
                              Number(e.target.value) || 0,
                            )
                          }
                          className="w-24 rounded border px-2 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {money(lineNet(line))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Ara Toplam</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>İndirim</span>
              <span className="tabular-nums">{money(totals.discount)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Vergi</span>
              <span className="text-xs">Satışta hesaplanır</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Genel Toplam</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Ödeme Yöntemi
            </legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {(
                [
                  ["CASH", "Nakit"],
                  ["CREDIT_CARD", "Kredi Kartı"],
                  ["BANK_TRANSFER", "Havale / EFT"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="text-sm font-medium text-slate-700">Not</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Opsiyonel"
            />
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || createMutation.isPending}
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
            className="w-full rounded-md bg-[#1b6b8f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#16324f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Satışı Tamamla
          </button>
        </section>

        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg space-y-4">
              <h3 className="text-lg font-semibold">Satış özeti</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Müşteri</dt>
                  <dd>
                    {customerId
                      ? selectedCustomer
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() ||
                          selectedCustomer.email
                        : "Seçili müşteri"
                      : "Perakende Satış"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ürün satırı</dt>
                  <dd>{cart.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ödeme</dt>
                  <dd>
                    {paymentMethod === "CASH"
                      ? "Nakit"
                      : paymentMethod === "CREDIT_CARD"
                        ? "Kredi Kartı"
                        : "Havale / EFT"}
                  </dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Toplam</dt>
                  <dd className="tabular-nums">{money(totals.total)}</dd>
                </div>
              </dl>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  onClick={() => setConfirmOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md bg-[#1b6b8f] px-3 py-2 text-sm font-medium text-white"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? "Kaydediliyor…" : "Onayla"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ModulePage>
  );
}
