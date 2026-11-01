"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignTypeLabel } from "@/lib/enum-labels";
import { ModulePage } from "@/components/auth/module-page";
import { campaignsService, catalogService } from "@/services/admin-api.service";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("10");

  const campaign = useQuery({
    queryKey: ["admin-campaign", id],
    queryFn: () => campaignsService.get(id),
  });
  const products = useQuery({
    queryKey: ["admin-campaign-products", id],
    queryFn: () => campaignsService.listProducts(id),
  });
  const catalog = useQuery({
    queryKey: ["admin-products-pick"],
    queryFn: () => catalogService.listProducts(1, 100),
  });

  const toggle = useMutation({
    mutationFn: (active: boolean) => campaignsService.update(id, { active }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["admin-campaign", id] }),
  });

  const addProduct = useMutation({
    mutationFn: () =>
      campaignsService.addProduct(id, {
        productId,
        discountPercentage:
          c.type === "PERCENTAGE" ? discountPercentage : undefined,
        discountAmount:
          c.type === "FIXED_AMOUNT" ? discountPercentage : undefined,
        specialPrice:
          c.type === "SPECIAL_PRICE" ? discountPercentage : undefined,
      }),
    onSuccess: () => {
      setProductId("");
      void queryClient.invalidateQueries({
        queryKey: ["admin-campaign-products", id],
      });
    },
  });

  const removeProduct = useMutation({
    mutationFn: (pid: string) => campaignsService.removeProduct(id, pid),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["admin-campaign-products", id],
      }),
  });

  if (campaign.isLoading || !campaign.data) {
    return (
      <ModulePage permission="campaign.read">
        <p>Yükleniyor…</p>
      </ModulePage>
    );
  }

  const c = campaign.data;

  return (
    <ModulePage permission="campaign.read">
      <div className="space-y-6">
        <Link href="/campaigns" className="text-sm text-[#1b6b8f] underline">
          ← Kampanyalar
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {c.name}
            </h2>
            <p className="text-sm text-slate-500">
              {campaignTypeLabel(c.type)} · öncelik {c.priority} · {c.slug}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => toggle.mutate(!c.active)}
          >
            {c.active ? "Pasifleştir" : "Aktifleştir"}
          </button>
        </div>

        <p className="text-sm text-slate-600">{c.description}</p>

        <section className="space-y-3 rounded-xl border bg-white p-4">
          <h3 className="font-semibold">Ürünler</h3>
          <div className="flex flex-wrap gap-2">
            <select
              className="min-w-[220px] flex-1 rounded border px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Ürün seç</option>
              {(catalog.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <input
              className="w-24 rounded border px-3 py-2 text-sm"
              placeholder="% indirim"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              disabled={!productId}
              onClick={() => addProduct.mutate()}
            >
              Ekle
            </button>
          </div>
          <ul className="divide-y text-sm">
            {(products.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between py-2"
              >
                <span>
                  {row.product?.sku} — {row.product?.name}
                  {row.discountPercentage
                    ? ` (%${row.discountPercentage})`
                    : ""}
                </span>
                <button
                  type="button"
                  className="text-red-700 underline"
                  onClick={() => removeProduct.mutate(row.productId)}
                >
                  Çıkar
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ModulePage>
  );
}
