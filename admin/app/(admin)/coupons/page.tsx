"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { couponTypeLabel } from "@/lib/enum-labels";
import { usePermissions } from "@/hooks/use-permissions";
import { couponsAdminService } from "@/services/admin-api.service";

export default function CouponsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: "10",
    minimumOrderAmount: "",
    maximumDiscountAmount: "",
    usageLimit: "",
    perUserLimit: "1",
    startsAt: "",
    endsAt: "",
  });

  const list = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => couponsAdminService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      couponsAdminService.create({
        code: form.code,
        type: form.type,
        value: form.value,
        minimumOrderAmount: form.minimumOrderAmount || undefined,
        maximumDiscountAmount: form.maximumDiscountAmount || undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: true,
      }),
    onSuccess: () => {
      setForm((f) => ({ ...f, code: "" }));
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  return (
    <ModulePage permission="campaign.read">
      <div className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Kuponlar
        </h2>

        {can("campaign.create") && (
          <form
            className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <input
              className="rounded border px-3 py-2 font-mono text-sm uppercase"
              placeholder="CODE"
              required
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
            />
            <select
              className="rounded border px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="PERCENTAGE">Yüzde</option>
              <option value="FIXED_AMOUNT">Sabit tutar</option>
            </select>
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Value"
              required
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Min order"
              value={form.minimumOrderAmount}
              onChange={(e) =>
                setForm((f) => ({ ...f, minimumOrderAmount: e.target.value }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Max discount"
              value={form.maximumDiscountAmount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maximumDiscountAmount: e.target.value,
                }))
              }
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Usage limit"
              value={form.usageLimit}
              onChange={(e) =>
                setForm((f) => ({ ...f, usageLimit: e.target.value }))
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
            <button
              type="submit"
              className="rounded-md bg-[#16324f] px-3 py-2 text-sm text-white"
            >
              Oluştur
            </button>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Usage</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{row.code}</td>
                  <td className="px-3 py-2">{couponTypeLabel(row.type)}</td>
                  <td className="px-3 py-2">{row.value}</td>
                  <td className="px-3 py-2">
                    {row.usageCount}
                    {row.usageLimit != null ? ` / ${row.usageLimit}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(row.startsAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(row.endsAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-3 py-2">
                    {row.active ? "Aktif" : "Pasif"}
                  </td>
                  <td className="px-3 py-2">
                    {can("campaign.update") && (
                      <button
                        type="button"
                        className="underline"
                        onClick={() =>
                          void couponsAdminService
                            .update(row.id, { active: !row.active })
                            .then(() =>
                              queryClient.invalidateQueries({
                                queryKey: ["admin-coupons"],
                              }),
                            )
                        }
                      >
                        {row.active ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                    )}
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
