import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/ui/product-card";
import { catalogService } from "@/services/catalog.service";

export const metadata: Metadata = {
  title: "Ana Sayfa",
  description: "Anamur Acil Medikal ve Anamur İşitme Merkezi ürünleri",
  alternates: { canonical: "/" },
};

function SectionHeader({
  title,
  href,
  actionLabel = "Tümü",
}: {
  title: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground md:text-[1.75rem]">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="text-sm font-semibold text-primary hover:text-primary-dark"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [banners, categories, featured, campaigns, bestSelling, brands] =
    await Promise.all([
      catalogService.banners().catch(() => []),
      catalogService.categories().catch(() => []),
      catalogService.featured().catch(() => []),
      catalogService.campaignProducts().catch(() => []),
      catalogService.bestSelling().catch(() => []),
      catalogService.brands().catch(() => []),
    ]);

  const hero = banners[0];

  return (
    <div className="space-y-14 md:space-y-16">
      <section className="relative overflow-hidden rounded-2xl bg-primary text-white shadow-[0_16px_40px_rgba(22,50,79,0.18)]">
        {hero ? (
          <div className="grid md:grid-cols-2">
            <div className="relative min-h-[300px] md:min-h-[360px]">
              <Image
                src={hero.imageUrl}
                alt={hero.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
            <div className="flex flex-col justify-center p-8 md:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-light">
                ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
                {hero.title}
              </h1>
              {hero.subtitle ? (
                <p className="mt-3 max-w-md text-white/80">{hero.subtitle}</p>
              ) : null}
              <Link
                href={
                  hero.linkType === "CATEGORY" && hero.linkValue
                    ? `/categories/${hero.linkValue}`
                    : hero.linkType === "PRODUCT" && hero.linkValue
                      ? `/products/${hero.linkValue}`
                      : hero.linkType === "URL" && hero.linkValue
                        ? hero.linkValue
                        : "/products"
                }
                className="mt-7 inline-flex w-fit rounded-[11px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark hover:text-white"
              >
                İncele
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-10 md:p-14">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">
              ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ
            </h1>
            <p className="mt-3 max-w-xl text-white/80">
              Medikal ürünler ve işitme sağlığı çözümleri.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex rounded-[11px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark hover:text-white"
            >
              Ürünlere göz at
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Kategoriler" href="/categories" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {categories.slice(0, 8).map((cat) => {
            const label = cat.name?.trim() || cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(27,107,143,0.1)]"
              >
                <div className="flex aspect-[16/10] items-center justify-center bg-surface-secondary">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-lg font-bold text-primary-dark">
                    {label.slice(0, 1).toLocaleUpperCase("tr-TR")}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                  <span
                    title={label}
                    className="line-clamp-2 break-words text-[15px] font-semibold text-foreground"
                  >
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    Ürünleri Gör →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 ? (
        <section>
          <SectionHeader
            title="Öne Çıkan Ürünler"
            href="/products?sort=recommended"
          />
          <ProductGrid products={featured} />
        </section>
      ) : null}

      {campaigns.length > 0 ? (
        <section>
          <SectionHeader
            title="Kampanyalı Ürünler"
            href="/campaigns"
            actionLabel="Tüm kampanyalar"
          />
          <ProductGrid products={campaigns} />
        </section>
      ) : null}

      {bestSelling.length > 0 ? (
        <section>
          <SectionHeader title="Çok Satanlar" href="/products" />
          <ProductGrid products={bestSelling} />
        </section>
      ) : null}

      {brands.length > 0 ? (
        <section>
          <SectionHeader title="Markalar" href="/brands" />
          <div className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/products?brand=${brand.slug}`}
                className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary-light hover:text-primary-dark"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] md:grid-cols-3 md:p-8">
        {[
          ["Orijinal ürün", "Yetkili ve güvenilir tedarik"],
          ["Hızlı sevkiyat", "Stoktan hızlı hazırlık"],
          ["Teknik destek", "Uzman ekip ile satış sonrası destek"],
        ].map(([title, text]) => (
          <div key={title}>
            <h3 className="font-semibold text-primary">{title}</h3>
            <p className="mt-1.5 text-sm text-text-secondary">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
