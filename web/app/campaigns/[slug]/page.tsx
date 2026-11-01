import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Price } from "@/components/ui/price";
import { serverApiFetch } from "@/lib/api/server";
import type { ProductListItem } from "@/types/api";

type CampaignLanding = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  endsAt: string;
  startsAt: string;
  active: boolean;
  status: "ACTIVE" | "EXPIRED" | "INACTIVE";
};

type CampaignProductRow = {
  productId: string;
  product?: { id: string; name: string; slug: string; sku: string };
  discountPercentage: string | null;
  discountAmount: string | null;
  specialPrice: string | null;
};

async function loadCampaign(slug: string) {
  try {
    return await serverApiFetch<CampaignLanding>(
      `/campaigns/${encodeURIComponent(slug)}`,
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  if (!campaign) {
    return { title: "Kampanya bulunamadı" };
  }
  return {
    title: campaign.name,
    description: campaign.description ?? `${campaign.name} kampanyası`,
    alternates: { canonical: `/campaigns/${campaign.slug}` },
    openGraph: {
      title: campaign.name,
      description: campaign.description ?? undefined,
    },
  };
}

export default async function CampaignLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  if (!campaign) notFound();

  const rows = await serverApiFetch<CampaignProductRow[]>(
    `/campaigns/${encodeURIComponent(slug)}/products`,
  ).catch(() => [] as CampaignProductRow[]);

  const productDetails = await Promise.all(
    rows.slice(0, 24).map(async (row) => {
      if (!row.product?.slug) return null;
      try {
        return await serverApiFetch<ProductListItem>(
          `/products/${encodeURIComponent(row.product.slug)}`,
        );
      } catch {
        return null;
      }
    }),
  );

  const endsAtMs = new Date(campaign.endsAt).getTime();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Kampanya
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-navy">
          {campaign.name}
        </h1>
        {campaign.description ? (
          <p className="max-w-2xl text-slate-600">{campaign.description}</p>
        ) : null}
        {campaign.status === "EXPIRED" || campaign.status === "INACTIVE" ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Bu kampanya sona ermiştir.
          </p>
        ) : (
          <p className="text-sm text-slate-500" suppressHydrationWarning>
            Bitiş: {new Date(campaign.endsAt).toLocaleString("tr-TR")}
            {/* Countdown is UI-only; eligibility is decided by the API */}
            <span className="ml-2 font-mono text-xs">
              (kalan ~{Math.max(0, Math.ceil((endsAtMs - Date.now()) / 3600000))}{" "}
              saat)
            </span>
          </p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productDetails.filter(Boolean).map((product) =>
          product ? (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="rounded-xl border bg-white p-4 transition hover:border-accent/50"
            >
              <h3 className="font-medium text-navy">{product.name}</h3>
              {product.onCampaign ? (
                <span className="mt-1 inline-block text-xs font-semibold text-primary">
                  Kampanya
                </span>
              ) : null}
              {product.price ? (
                <div className="mt-2">
                  <Price
                    amount={product.price.amount}
                    currency={product.price.currency}
                    compareAt={product.compareAtPrice?.amount}
                  />
                </div>
              ) : null}
            </Link>
          ) : null,
        )}
      </section>
    </div>
  );
}
