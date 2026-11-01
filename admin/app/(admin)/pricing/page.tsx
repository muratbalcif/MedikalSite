"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api-client";
import { PRICE_TYPE_LABEL, priceTypeLabel } from "@/lib/enum-labels";
import {
  catalogService,
  customerPricingService,
  customersAdminService,
} from "@/services/admin-api.service";

type Tab = "product" | "customer";

const PRICE_TYPES = ["RETAIL", "CAMPAIGN", "WHOLESALE", "CORPORATE"] as const;

export default function PricingPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("product");

  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productForm, setProductForm] = useState({
    type: "RETAIL",
    price: "",
    validFrom: "",
    validTo: "",
  });
  const [productError, setProductError] = useState<string | null>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerForm, setCustomerForm] = useState({
    productId: "",
    price: "",
    validFrom: "",
    validTo: "",
  });
  const [customerError, setCustomerError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["admin-pricing-products", productSearch],
    queryFn: () =>
      catalogService.listProducts(1, 50, {
        search: productSearch || undefined,
      }),
  });

  const productPricesQuery = useQuery({
    queryKey: ["admin-product-prices", selectedProductId],
    queryFn: () => catalogService.listProductPrices(selectedProductId),
    enabled: Boolean(selectedProductId),
  });

  const customersQuery = useQuery({
    queryKey: ["admin-pricing-customers", customerSearch],
    queryFn: () =>
      customersAdminService.list(1, 50, {
        search: customerSearch || undefined,
      }),
  });

  const customerPricesQuery = useQuery({
    queryKey: ["admin-customer-prices", selectedCustomerId],
    queryFn: () => customerPricingService.list(selectedCustomerId),
    enabled: Boolean(selectedCustomerId),
  });

  const createProductPrice = useMutation({
    mutationFn: () => {
      if (!selectedProductId || !productForm.price.trim()) {
        throw new Error("Ürün ve tutar zorunlu");
      }
      return catalogService.createProductPrice(selectedProductId, {
        type: productForm.type,
        price: productForm.price.trim(),
        validFrom: productForm.validFrom || undefined,
        validTo: productForm.validTo || undefined,
      });
    },
    onSuccess: () => {
      setProductError(null);
      setProductForm((f) => ({ ...f, price: "", validFrom: "", validTo: "" }));
      void queryClient.invalidateQueries({
        queryKey: ["admin-product-prices", selectedProductId],
      });
    },
    onError: (err: Error) =>
      setProductError(err instanceof ApiError ? err.message : err.message),
  });

  const deactivateProductPrice = useMutation({
    mutationFn: (priceId: string) =>
      catalogService.deactivateProductPrice(priceId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-product-prices", selectedProductId],
      }),
  });

  const createCustomerPrice = useMutation({
    mutationFn: () => {
      if (
        !selectedCustomerId ||
        !customerForm.productId.trim() ||
        !customerForm.price.trim()
      ) {
        throw new Error("Müşteri, ürün ID ve tutar zorunlu");
      }
      return customerPricingService.create(selectedCustomerId, {
        productId: customerForm.productId.trim(),
        price: customerForm.price.trim(),
        validFrom: customerForm.validFrom || undefined,
        validTo: customerForm.validTo || undefined,
      });
    },
    onSuccess: () => {
      setCustomerError(null);
      setCustomerForm({
        productId: "",
        price: "",
        validFrom: "",
        validTo: "",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-customer-prices", selectedCustomerId],
      });
    },
    onError: (err: Error) =>
      setCustomerError(err instanceof ApiError ? err.message : err.message),
  });

  const deactivateCustomerPrice = useMutation({
    mutationFn: (priceId: string) => customerPricingService.deactivate(priceId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-customer-prices", selectedCustomerId],
      }),
  });

  const products = productsQuery.data?.items ?? [];
  const customers = customersQuery.data?.items ?? [];

  return (
    <ModulePage permission="pricing.read">
      <div className="space-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
            Fiyatlandırma
          </h1>
          <p className="text-sm text-slate-600">
            Ürün fiyatları ve müşteri özel fiyatları. Checkout ile aynı{" "}
            <code className="text-xs">/admin/pricing</code> API.
          </p>
        </div>

        <div className="flex gap-2">
          {(
            [
              ["product", "Ürün fiyatları"],
              ["customer", "Müşteri özel fiyat"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === key
                  ? "bg-[#16324f] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "product" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-3 rounded-xl border bg-white p-4">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Ürün ara (SKU / ad)"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Ürünler yükleniyor…</p>
              ) : productsQuery.error ? (
                <p className="text-sm text-red-600">Ürün listesi alınamadı.</p>
              ) : (
                <ul className="max-h-80 space-y-1 overflow-auto text-sm">
                  {products.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`w-full rounded px-2 py-1.5 text-left hover:bg-slate-50 ${
                          selectedProductId === p.id ? "bg-[#f0f5f8]" : ""
                        }`}
                        onClick={() => setSelectedProductId(p.id)}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-slate-500">
                          {p.sku}
                        </span>
                      </button>
                    </li>
                  ))}
                  {products.length === 0 ? (
                    <li className="text-slate-500">Ürün bulunamadı.</li>
                  ) : null}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-xl border bg-white p-4">
              {!selectedProductId ? (
                <p className="text-sm text-slate-500">
                  Fiyat yönetmek için soldan ürün seçin.
                </p>
              ) : productPricesQuery.isLoading ? (
                <p className="text-sm text-slate-500">Fiyatlar yükleniyor…</p>
              ) : productPricesQuery.error ? (
                <p className="text-sm text-red-600">Fiyatlar alınamadı.</p>
              ) : (
                <>
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-2">Tip</th>
                        <th>Tutar</th>
                        <th>Geçerlilik</th>
                        <th>Aktif</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {(productPricesQuery.data ?? []).map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="py-2">{priceTypeLabel(row.type)}</td>
                          <td>
                            {row.price} {row.currency}
                          </td>
                          <td className="text-xs text-slate-500">
                            {row.validFrom ?? "—"} → {row.validTo ?? "—"}
                          </td>
                          <td>{row.active ? "Evet" : "Hayır"}</td>
                          <td>
                            {can("pricing.delete") && row.active ? (
                              <button
                                type="button"
                                className="text-red-700 underline"
                                disabled={deactivateProductPrice.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Bu ürün fiyatını pasife almak istiyor musunuz?",
                                    )
                                  ) {
                                    deactivateProductPrice.mutate(row.id);
                                  }
                                }}
                              >
                                Pasife al
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(productPricesQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Bu ürün için fiyat kaydı yok.
                    </p>
                  ) : null}
                </>
              )}

              {selectedProductId && can("pricing.create") ? (
                <form
                  className="grid gap-2 border-t pt-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setProductError(null);
                    createProductPrice.mutate();
                  }}
                >
                  <select
                    className="rounded border px-3 py-2 text-sm"
                    value={productForm.type}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, type: e.target.value }))
                    }
                  >
                    {PRICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PRICE_TYPE_LABEL[type] ?? type}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    className="rounded border px-3 py-2 text-sm"
                    placeholder="Tutar (örn. 12990.00)"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                  <input
                    type="date"
                    className="rounded border px-3 py-2 text-sm"
                    value={productForm.validFrom}
                    onChange={(e) =>
                      setProductForm((f) => ({
                        ...f,
                        validFrom: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="date"
                    className="rounded border px-3 py-2 text-sm"
                    value={productForm.validTo}
                    onChange={(e) =>
                      setProductForm((f) => ({
                        ...f,
                        validTo: e.target.value,
                      }))
                    }
                  />
                  {productError ? (
                    <p className="text-sm text-red-600 sm:col-span-2">
                      {productError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={createProductPrice.isPending}
                    className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50 sm:col-span-2"
                  >
                    {createProductPrice.isPending
                      ? "Kaydediliyor…"
                      : "Ürün fiyatı ekle"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-3 rounded-xl border bg-white p-4">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Müşteri ara"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customersQuery.isLoading ? (
                <p className="text-sm text-slate-500">Müşteriler yükleniyor…</p>
              ) : customersQuery.error ? (
                <p className="text-sm text-red-600">Müşteri listesi alınamadı.</p>
              ) : (
                <ul className="max-h-80 space-y-1 overflow-auto text-sm">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`w-full rounded px-2 py-1.5 text-left hover:bg-slate-50 ${
                          selectedCustomerId === c.id ? "bg-[#f0f5f8]" : ""
                        }`}
                        onClick={() => setSelectedCustomerId(c.id)}
                      >
                        <span className="font-medium">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {c.email}
                          {c.companyName ? ` · ${c.companyName}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {customers.length === 0 ? (
                    <li className="text-slate-500">Müşteri bulunamadı.</li>
                  ) : null}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-xl border bg-white p-4">
              {!selectedCustomerId ? (
                <p className="text-sm text-slate-500">
                  Özel fiyat için soldan müşteri seçin.
                </p>
              ) : customerPricesQuery.isLoading ? (
                <p className="text-sm text-slate-500">Özel fiyatlar yükleniyor…</p>
              ) : customerPricesQuery.error ? (
                <p className="text-sm text-red-600">Özel fiyatlar alınamadı.</p>
              ) : (
                <>
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-2">Ürün ID</th>
                        <th>Tutar</th>
                        <th>Aktif</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {(customerPricesQuery.data ?? []).map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="py-2 font-mono text-xs">
                            {row.productId}
                          </td>
                          <td>
                            {row.price} {row.currency}
                          </td>
                          <td>{row.active ? "Evet" : "Hayır"}</td>
                          <td>
                            {can("pricing.delete") && row.active ? (
                              <button
                                type="button"
                                className="text-red-700 underline"
                                disabled={deactivateCustomerPrice.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Bu özel fiyatı pasife almak istiyor musunuz?",
                                    )
                                  ) {
                                    deactivateCustomerPrice.mutate(row.id);
                                  }
                                }}
                              >
                                Pasife al
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(customerPricesQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Bu müşteri için özel fiyat yok.
                    </p>
                  ) : null}
                </>
              )}

              {selectedCustomerId && can("pricing.create") ? (
                <form
                  className="grid gap-2 border-t pt-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCustomerError(null);
                    createCustomerPrice.mutate();
                  }}
                >
                  <input
                    required
                    className="rounded border px-3 py-2 text-sm sm:col-span-2"
                    placeholder="Ürün UUID"
                    value={customerForm.productId}
                    onChange={(e) =>
                      setCustomerForm((f) => ({
                        ...f,
                        productId: e.target.value,
                      }))
                    }
                  />
                  <input
                    required
                    className="rounded border px-3 py-2 text-sm"
                    placeholder="Özel tutar"
                    value={customerForm.price}
                    onChange={(e) =>
                      setCustomerForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="rounded border px-3 py-2 text-sm"
                      value={customerForm.validFrom}
                      onChange={(e) =>
                        setCustomerForm((f) => ({
                          ...f,
                          validFrom: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="date"
                      className="rounded border px-3 py-2 text-sm"
                      value={customerForm.validTo}
                      onChange={(e) =>
                        setCustomerForm((f) => ({
                          ...f,
                          validTo: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {customerError ? (
                    <p className="text-sm text-red-600 sm:col-span-2">
                      {customerError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={createCustomerPrice.isPending}
                    className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50 sm:col-span-2"
                  >
                    {createCustomerPrice.isPending
                      ? "Kaydediliyor…"
                      : "Özel fiyat ekle"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
