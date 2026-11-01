"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { clientApiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/base";

type Cart = {
  items: Array<{
    quantity: number;
    unitPrice: string | null;
    subtotal: string | null;
    currency: string | null;
    available: boolean;
    issueCode: string | null;
    product: { id: string; name: string; slug: string; sku: string };
  }>;
  summary: {
    subtotal: string;
    discount: string;
    total: string;
    currency: string;
  };
};

export default function CartPage() {
  const queryClient = useQueryClient();
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => clientApiFetch<Cart>("/cart"),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) =>
      clientApiFetch(`/cart/items/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) =>
      clientApiFetch(`/cart/items/${productId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  if (cartQuery.isError) {
    const error = cartQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      return (
        <EmptyState
          title="Sepeti görmek için giriş yapın"
          description="Sepet hesabınıza bağlıdır."
          actionHref="/login?next=/cart"
          actionLabel="Giriş yap"
        />
      );
    }
    return <EmptyState title="Sepet yüklenemedi" description={String(error)} />;
  }

  if (cartQuery.isLoading) {
    return <p>Sepet yükleniyor…</p>;
  }

  const cart = cartQuery.data;
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Sepetiniz boş"
        actionHref="/products"
        actionLabel="Alışverişe başla"
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Sepet
        </h1>
        {cart.items.map((item) => (
          <div
            key={item.product.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4"
          >
            <div>
              <Link
                href={`/products/${item.product.slug}`}
                className="font-medium text-navy hover:text-primary"
              >
                {item.product.name}
              </Link>
              <p className="text-xs text-slate-500">{item.product.sku}</p>
              <p className="mt-1 text-sm">
                {item.unitPrice} {item.currency}
              </p>
              {!item.available ? (
                <p className="text-xs text-red-600">
                  {item.issueCode ?? "Ürün sepete uygun değil"}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  updateMutation.mutate({
                    productId: item.product.id,
                    quantity: Math.max(1, item.quantity - 1),
                  })
                }
              >
                -
              </Button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  updateMutation.mutate({
                    productId: item.product.id,
                    quantity: item.quantity + 1,
                  })
                }
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeMutation.mutate(item.product.id)}
              >
                Sil
              </Button>
            </div>
            <p className="font-semibold">
              {item.subtotal} {item.currency}
            </p>
          </div>
        ))}
      </div>
      <aside className="h-fit rounded-lg border bg-white p-4">
        <h2 className="font-semibold text-navy">Özet</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Ara toplam</dt>
            <dd>
              {cart.summary.subtotal} {cart.summary.currency}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>İndirim</dt>
            <dd>
              {cart.summary.discount} {cart.summary.currency}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>Genel toplam</dt>
            <dd>
              {cart.summary.total} {cart.summary.currency}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          Fiyatlar KDV dahildir. Toplam backend tarafından hesaplanır.
        </p>
        <Link
          href="/checkout"
          className="mt-4 inline-flex w-full justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Ödemeye geç
        </Link>
      </aside>
    </div>
  );
}
