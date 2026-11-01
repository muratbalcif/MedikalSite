"use client";

import { useState } from "react";

export type ProductAttributeRow = {
  name: string;
  value: string;
};

const DEFAULT_SUGGESTIONS = [
  "Soğutma kapasitesi",
  "Isıtma kapasitesi",
  "Enerji sınıfı",
  "Gaz tipi",
  "Ses seviyesi",
  "Enerji tüketimi",
  "İç ünite boyutları",
  "Dış ünite boyutları",
  "Soğutucu akışkan",
  "Çalışma aralığı",
];

type ProductAttributesEditorProps = {
  value: ProductAttributeRow[];
  onChange: (next: ProductAttributeRow[]) => void;
  suggestions?: string[];
};

export function ProductAttributesEditor({
  value,
  onChange,
  suggestions = DEFAULT_SUGGESTIONS,
}: ProductAttributesEditorProps) {
  const [draftName, setDraftName] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addAttribute(name: string, attrValue: string) {
    const trimmedName = name.trim();
    const trimmedValue = attrValue.trim();
    if (!trimmedName || !trimmedValue) {
      setError("Özellik adı ve değer zorunludur.");
      return;
    }
    const duplicate = value.some(
      (row) => row.name.trim().toLocaleLowerCase("tr") === trimmedName.toLocaleLowerCase("tr"),
    );
    if (duplicate) {
      setError(`“${trimmedName}” zaten listede. Aynı isimle tekrar eklenmez.`);
      return;
    }
    onChange([...value, { name: trimmedName, value: trimmedValue }]);
    setDraftName("");
    setDraftValue("");
    setError(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  function updateRow(index: number, patch: Partial<ProductAttributeRow>) {
    const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Teknik Özellikler</h3>
        <p className="text-xs text-slate-500">
          Özellikler kaydedildiğinde sıraya göre sortOrder (0, 1, 2…) atanır.
        </p>
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="rounded-full border border-[#d9e8ef] bg-[#f0f5f8] px-2.5 py-1 text-xs text-[#16324f] hover:bg-[#d9e8ef]"
              onClick={() => {
                setDraftName(name);
                setError(null);
              }}
            >
              + {name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Özellik</th>
              <th className="px-3 py-2 font-medium">Değer</th>
              <th className="px-3 py-2 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {value.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                  Henüz teknik özellik eklenmedi.
                </td>
              </tr>
            ) : (
              value.map((row, index) => (
                <tr key={`${row.name}-${index}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1.5"
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      aria-label={`Özellik adı ${index + 1}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1.5"
                      value={row.value}
                      onChange={(e) => updateRow(index, { value: e.target.value })}
                      aria-label={`Özellik değeri ${index + 1}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Yukarı taşı"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                        disabled={index === value.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Aşağı taşı"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                        onClick={() => remove(index)}
                        aria-label="Sil"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          addAttribute(draftName, draftValue);
        }}
      >
        <label className="block flex-1 text-sm">
          Özellik adı
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              setError(null);
            }}
            placeholder="Örn. Güç"
          />
        </label>
        <label className="block flex-1 text-sm">
          Değer
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={draftValue}
            onChange={(e) => {
              setDraftValue(e.target.value);
              setError(null);
            }}
            placeholder="Örn. 60W"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Özellik Ekle
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Map editor rows to API payload with sortOrder = array index. */
export function attributesToPayload(rows: ProductAttributeRow[]) {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      value: row.value.trim(),
    }))
    .filter((row) => row.name && row.value)
    .map((row, sortOrder) => ({ ...row, sortOrder }));
}
