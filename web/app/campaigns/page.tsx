import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { campaignTypeLabel } from "@/lib/order-labels";
import { catalogService } from "@/services/catalog.service";

export const metadata: Metadata = {
  title: "Kampanyalar",
  description: "Anamur Acil Medikal ve İşitme Merkezi kampanyaları",
  alternates: { canonical: "/campaigns" },
};

export default async function CampaignsIndexPage() {
  let campaigns: Awaited<ReturnType<typeof catalogService.campaigns>> = [];
  let error: string | null = null;
  try {
    campaigns = await catalogService.campaigns();
  } catch (err) {
    error = err instanceof Error ? err.message : "Kampanyalar yüklenemedi";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Kampanyalar
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-navy">
          Aktif kampanyalar
        </h1>
        <p className="max-w-2xl text-slate-600">
          Geçerli tarih aralığındaki kampanyalar. Detay sayfasında ürünler ve
          bitiş durumu gösterilir.
        </p>
      </header>

      {error ? (
        <EmptyState
          title="Kampanyalar alınamadı"
          description={error}
          actionHref="/"
          actionLabel="Ana sayfa"
        />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="Şu an aktif kampanya yok"
          description="Yeni kampanyalar eklendiğinde burada listelenir."
          actionHref="/products"
          actionLabel="Ürünlere göz at"
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.slug}`}
              className="rounded-xl border bg-white p-5 transition hover:border-accent/50"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {campaignTypeLabel(campaign.type)}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-navy">
                {campaign.name}
              </h2>
              {campaign.description ? (
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {campaign.description}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-slate-500" suppressHydrationWarning>
                Bitiş: {new Date(campaign.endsAt).toLocaleString("tr-TR")}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
