"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { CAMPAIGN_TYPE_LABEL } from "@/lib/enum-labels";
import { usePermissions } from "@/hooks/use-permissions";
import { campaignsService } from "@/services/admin-api.service";

export default function CampaignsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    type: "PERCENTAGE",
    priority: "10",
    startsAt: "",
    endsAt: "",
    active: true,
  });

  const list = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: () => campaignsService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      campaignsService.create({
        ...form,
        priority: Number(form.priority),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      }),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
  });

  return (
    <ModulePage permission="campaign.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              Kampanyalar
            </h2>
            <p className="text-sm text-slate-500">
              Öncelik: yüksek priority → düşük fiyat → düşük campaignId
            </p>
          </div>
          {can("campaign.create") && (
            <button
              type="button"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Kapat" : "Yeni kampanya"}
            </button>
          )}
        </div>

        {showForm && (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Ad"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="rounded border px-3 py-2 text-sm font-mono"
              placeholder="slug"
              required
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                }))
              }
            />
            <select
              className="rounded border px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="PERCENTAGE">Yüzde indirim</option>
              <option value="FIXED_AMOUNT">Sabit tutar</option>
              <option value="SPECIAL_PRICE">Özel fiyat</option>
            </select>
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Priority"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            />
            <input
              type="datetime-local"
              className="rounded border px-3 py-2 text-sm"
              required
              value={form.startsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAt: e.target.value }))
              }
            />
            <input
              type="datetime-local"
              className="rounded border px-3 py-2 text-sm"
              required
              value={form.endsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsAt: e.target.value }))
              }
            />
            <textarea
              className="rounded border px-3 py-2 text-sm sm:col-span-2"
              placeholder="Açıklama"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <button
              type="submit"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white sm:col-span-2"
            >
              Kaydet
            </button>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Kampanya</th>
                <th className="px-4 py-3">Başlangıç</th>
                <th className="px-4 py-3">Bitiş</th>
                <th className="px-4 py-3">Öncelik</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {CAMPAIGN_TYPE_LABEL[row.type] ?? row.type} · {row.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(row.startsAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(row.endsAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">{row.priority}</td>
                  <td className="px-4 py-3">
                    {row.active ? "Aktif" : "Pasif"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/campaigns/${row.id}`}
                      className="text-[#1b6b8f] underline"
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
}
