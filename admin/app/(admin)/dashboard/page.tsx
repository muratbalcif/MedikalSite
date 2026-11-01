"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { fetchDashboardTotals } from "@/services/dashboard.service";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-totals"],
    queryFn: fetchDashboardTotals,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50/40 p-6">
        <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
          Merhaba, {user?.firstName}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Özet sayılar mevcut admin API uçlarından canlı çekilir. Sahte istatistik
          yoktur.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(user?.roles ?? []).map((role) => (
            <span
              key={role}
              className="rounded-md bg-[#16324f] px-2 py-1 text-xs text-[#f0f5f8]"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Canlı özet</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          {isFetching ? "Yenileniyor…" : "Yenile"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-600">Dashboard yükleniyor…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Dashboard verisi alınamadı. API&apos;nin çalıştığından emin olun.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Bekleyen havale bildirimleri"
            value={data?.pendingBankTransfers ?? null}
          />
          <StatCard
            label="Bekleyen ödemeler"
            value={data?.pendingPayments ?? null}
          />
          <StatCard
            label="Onaylanan ödemeler"
            value={data?.paidPayments ?? null}
          />
          <StatCard
            label="Bugünkü havale tutarı"
            value={data?.todayTransferAmount ?? null}
          />
          <StatCard
            label="Bekleyen siparişler"
            value={data?.pendingOrders ?? null}
          />
          <StatCard
            label="Kritik stoklar"
            value={data?.criticalStock ?? null}
          />
          <StatCard
            label="Aktif kampanyalar"
            value={data?.activeCampaigns ?? null}
          />
          <StatCard
            label="Aktif kuponlar"
            value={data?.activeCoupons ?? null}
          />
          <StatCard
            label="Öne çıkan ürünler"
            value={data?.featuredProducts ?? null}
          />
          <StatCard label="Ürünler" value={data?.products ?? null} />
          <StatCard label="Siparişler" value={data?.orders ?? null} />
          <StatCard label="Ödemeler" value={data?.payments ?? null} />
          <StatCard label="Stok kayıtları" value={data?.inventory ?? null} />
          <StatCard label="Kampanyalar" value={data?.campaigns ?? null} />
          <StatCard label="Bannerlar" value={data?.banners ?? null} />
          <StatCard label="Bildirimler" value={data?.notifications ?? null} />
          <StatCard
            label="Havale bildirimleri"
            value={data?.bankTransfers ?? null}
          />
          <StatCard
            label="Muhasebe hareketleri"
            value={data?.accountingTransactions ?? null}
          />
        </div>
      )}
    </div>
  );
}
