import { useQuery } from "@tanstack/react-query";
import { listRegisters } from "../../api/pos";
import { friendlyErrorMessage } from "../../api/http";
import type { AuthUser, PosRegister } from "../../types/api";
import { useEffect } from "react";

export function RegisterSelectPage({
  user,
  onSelected,
  onLogout,
  windowsDownloadHref,
}: {
  user: AuthUser;
  onSelected: (register: PosRegister) => void;
  onLogout: () => void;
  /** When set (Admin web), shows Windows installer download link. */
  windowsDownloadHref?: string;
}) {
  const query = useQuery({
    queryKey: ["pos-registers"],
    queryFn: listRegisters,
  });

  useEffect(() => {
    if (query.data?.length === 1) {
      onSelected(query.data[0]!);
    }
  }, [query.data, onSelected]);

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">FurkanSoğutma POS</p>
          <h1 className="text-2xl font-bold">Kasa Seç</h1>
        </div>
        <div className="flex items-center gap-4">
          {windowsDownloadHref ? (
            <a
              href={windowsDownloadHref}
              className="rounded-lg border border-[var(--primary)] bg-[var(--primary-light)] px-3 py-2 text-sm font-semibold text-[var(--primary-dark)] hover:bg-[#d9e8ef]"
            >
              Windows .exe indir
            </a>
          ) : null}
          <span className="text-sm text-slate-600">
            {user.firstName} {user.lastName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium"
          >
            Çıkış
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
        {query.isLoading ? <p>Kasalar yükleniyor…</p> : null}
        {query.isError ? (
          <p className="text-[var(--error)]" role="alert">
            {friendlyErrorMessage(query.error)}
          </p>
        ) : null}
        {query.data?.length === 0 ? (
          <p>Aktif kasa bulunamadı. Admin panelinden kasa tanımlayın.</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {(query.data ?? []).map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => onSelected(reg)}
              className="rounded-2xl border border-[var(--border)] bg-white p-6 text-left shadow-sm hover:border-[var(--primary)] hover:ring-2 hover:ring-[var(--primary)]/20"
            >
              <p className="text-xl font-bold">{reg.name}</p>
              <p className="mt-1 text-sm text-slate-500">Kod: {reg.code}</p>
              <p className="mt-2 text-xs font-medium text-[var(--success)]">
                {reg.isActive ? "Aktif" : "Pasif"}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
