import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { catalogService } from "@/services/catalog.service";
import { resolveProductImageSrc } from "@/lib/product-image";

export const metadata: Metadata = {
  title: "Markalar",
  description: "Anamur Acil Medikal ve İşitme Merkezi markalarını keşfedin.",
  alternates: { canonical: "/brands" },
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

function brandLabel(brand: Brand): string {
  const name = brand.name?.trim();
  if (name) return name;
  const slug = brand.slug?.trim();
  if (slug) return slug.replace(/-/g, " ");
  return "Marka";
}

function BrandIcon({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-xl font-bold text-primary-dark"
    >
      {label.slice(0, 1).toLocaleUpperCase("tr-TR")}
    </span>
  );
}

function BrandCard({ brand }: { brand: Brand }) {
  const label = brandLabel(brand);
  const rawLogo = brand.logo?.trim() || null;
  const logoSrc = rawLogo ? resolveProductImageSrc(rawLogo) : null;
  const hasLogo = Boolean(logoSrc && logoSrc !== "/images/product-placeholder.svg");

  return (
    <Link
      href={`/products?brand=${encodeURIComponent(brand.slug)}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(15,118,110,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative flex aspect-[16/10] items-center justify-center bg-surface-secondary p-6">
        {hasLogo && logoSrc ? (
          <Image
            src={logoSrc}
            alt={label}
            fill
            sizes="(max-width:768px) 50vw, 25vw"
            className="object-contain p-6 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <BrandIcon label={label} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h2
          title={label}
          className="line-clamp-2 break-words text-[17px] font-semibold leading-snug text-foreground md:text-lg"
        >
          {label}
        </h2>
        <span className="mt-auto text-sm font-semibold text-primary transition group-hover:text-primary-dark">
          Ürünleri gör →
        </span>
      </div>
    </Link>
  );
}

export default async function BrandsPage() {
  let brands: Brand[] = [];
  let failed = false;
  try {
    brands = await catalogService.brands();
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <Breadcrumb
          items={[
            { label: "Ana Sayfa", href: "/" },
            { label: "Markalar" },
          ]}
        />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Markalar
        </h1>
        <p className="mt-2 max-w-2xl text-base text-text-secondary">
          Güvenilir markaların soğutma ve iklimlendirme ürünlerini inceleyin.
        </p>
      </div>

      {failed ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
            Markalar yüklenemedi
          </h2>
          <p className="mt-2 text-sm text-text-secondary">Tekrar deneyin</p>
          <Link
            href="/brands"
            className="mt-5 inline-flex rounded-[11px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Tekrar Dene
          </Link>
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
            Henüz marka bulunmuyor
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Markalar yakında burada listelenecek.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  );
}
