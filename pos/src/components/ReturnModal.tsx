import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { friendlyErrorMessage } from "../api/http";
import { createReturn, getSaleByNumber } from "../api/pos";
import { createIdempotencyKey } from "../utils/idempotency";
import { formatTry, money } from "../utils/money";

export function ReturnModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [saleNumber, setSaleNumber] = useState("");
  const [query, setQuery] = useState("");
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const saleQuery = useQuery({
    queryKey: ["pos-sale-by-number", query],
    queryFn: () => getSaleByNumber(query),
    enabled: query.length >= 8,
    retry: false,
  });

  useEffect(() => {
    if (saleQuery.data) {
      const init: Record<string, number> = {};
      for (const item of saleQuery.data.items) {
        init[item.id] = 0;
      }
      setQtyByItem(init);
      setError(null);
    }
  }, [saleQuery.data]);

  const estimated = useMemo(() => {
    const sale = saleQuery.data;
    if (!sale) return money(0);
    return sale.items.reduce((acc, item) => {
      const qty = qtyByItem[item.id] ?? 0;
      if (qty <= 0) return acc;
      const unit = money(item.lineTotal).div(item.quantity);
      return acc.add(unit.mul(qty));
    }, money(0));
  }, [saleQuery.data, qtyByItem]);

  const mutation = useMutation({
    mutationFn: async () => {
      const sale = saleQuery.data;
      if (!sale) throw new Error("Satış seçilmedi");
      const items = Object.entries(qtyByItem)
        .filter(([, q]) => q > 0)
        .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
      if (items.length === 0) throw new Error("İade miktarı girin");
      return createReturn(sale.id, { items }, createIdempotencyKey());
    },
    onSuccess: (res) => {
      onDone(`İade tamamlandı · ${formatTry(res.totalAmount)}`);
      onClose();
    },
    onError: (err) => setError(friendlyErrorMessage(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">İade (F9)</h2>
        <p className="mb-3 text-sm text-slate-500">
          Satış numarası ile ara (ör. POS-20260923-000123)
        </p>
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(saleNumber.trim().toUpperCase());
          }}
        >
          <input
            autoFocus
            className="flex-1 rounded border px-3 py-2 font-mono text-sm"
            placeholder="POS-…"
            value={saleNumber}
            onChange={(e) => setSaleNumber(e.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-[#16324f] px-3 py-2 text-sm text-white"
          >
            Getir
          </button>
        </form>

        {saleQuery.isFetching ? (
          <p className="text-sm text-slate-500">Aranıyor…</p>
        ) : saleQuery.error ? (
          <p className="text-sm text-red-600">Satış bulunamadı.</p>
        ) : saleQuery.data ? (
          <>
            <p className="mb-2 font-mono text-sm text-slate-700">
              {saleQuery.data.saleNumber} · {saleQuery.data.status}
            </p>
            <table className="mb-3 w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1">Ürün</th>
                  <th>Satılan</th>
                  <th>İade</th>
                  <th>Kalan</th>
                  <th>Adet</th>
                </tr>
              </thead>
              <tbody>
                {saleQuery.data.items.map((item) => {
                  const returnable =
                    item.returnableQuantity ??
                    item.quantity - (item.returnedQuantity ?? 0);
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 pr-2">{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.returnedQuantity ?? 0}</td>
                      <td>{returnable}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={returnable}
                          className="w-16 rounded border px-2 py-1"
                          disabled={returnable <= 0}
                          value={qtyByItem[item.id] ?? 0}
                          onChange={(e) => {
                            const v = Math.max(
                              0,
                              Math.min(returnable, Number(e.target.value) || 0),
                            );
                            setQtyByItem((prev) => ({
                              ...prev,
                              [item.id]: v,
                            }));
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mb-3 text-sm font-medium">
              Toplam iade: {formatTry(estimated)}
            </p>
          </>
        ) : null}

        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-3 py-2 text-sm"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="rounded bg-[#16324f] px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={
              mutation.isPending ||
              !saleQuery.data ||
              estimated.lessThanOrEqualTo(0)
            }
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "İade işleniyor…" : "İadeyi onayla"}
          </button>
        </div>
      </div>
    </div>
  );
}
