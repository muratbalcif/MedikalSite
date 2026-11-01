"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { canUsePos } from "furkansogutma-pos/api/permissions";
import { PosPage } from "furkansogutma-pos/features/pos/PosPage";
import { RegisterSelectPage } from "furkansogutma-pos/features/pos/RegisterSelectPage";
import { usePosStore } from "furkansogutma-pos/store/pos-store";
import type { AuthUser } from "furkansogutma-pos/types/api";

export default function AdminPosSellPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const registerId = usePosStore((s) => s.registerId);
  const setRegister = usePosStore((s) => s.setRegister);

  async function handleLogout() {
    usePosStore.getState().resetSale();
    usePosStore.setState({ registerId: null, registerLabel: null });
    await logout();
    router.replace("/login");
  }

  if (!user) return null;

  const posUser = user as AuthUser;

  if (!canUsePos(posUser)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold text-red-600">Yetkisiz</h1>
        <p className="text-slate-600">
          POS satış ekranı için SUPER_ADMIN, POS_CASHIER veya{" "}
          <code className="rounded bg-slate-100 px-1">pos.sell</code> yetkisi
          gerekli.
        </p>
        <button
          type="button"
          className="rounded-xl bg-[#1b6b8f] px-6 py-3 font-semibold text-white"
          onClick={() => router.push("/dashboard")}
        >
          Admin&apos;e dön
        </button>
      </div>
    );
  }

  if (!registerId) {
    return (
      <div className="flex h-screen flex-1 flex-col">
        <RegisterSelectPage
          user={posUser}
          windowsDownloadHref="/pos/download"
          onSelected={(reg) => {
            setRegister(reg.id, `${reg.name} (${reg.code})`);
          }}
          onLogout={() => void handleLogout()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-1 flex-col">
      <PosPage user={posUser} onLogout={() => void handleLogout()} />
    </div>
  );
}
