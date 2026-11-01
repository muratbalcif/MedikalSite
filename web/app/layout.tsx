import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import { catalogService } from "@/services/catalog.service";
import "./globals.css";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002",
  ),
  title: {
    default: "ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ",
    template: "%s | ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ",
  },
  description: "Anamur Acil Medikal ve Anamur İşitme Merkezi ürün ve hizmetleri",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let categories: Awaited<ReturnType<typeof catalogService.categories>> = [];
  let config: Awaited<ReturnType<typeof catalogService.siteConfig>> | null =
    null;
  try {
    [categories, config] = await Promise.all([
      catalogService.categories(),
      catalogService.siteConfig(),
    ]);
  } catch {
    config = {
      siteName: "ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ",
      supportEmail: "",
      supportPhone: "",
      address: "",
      privacyUrl: "/gizlilik",
      kvkkUrl: "/kvkk",
      termsUrl: "/kullanim-kosullari",
      bankTransferInfo: {
        bankName: "",
        iban: "",
        accountName: "",
      },
    };
  }

  return (
    <html lang="tr">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <Providers>
          <SiteHeader
            categories={categories}
          />
          <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-6">
            {children}
          </main>
          <SiteFooter
            config={config!}
            categories={categories}
          />
        </Providers>
      </body>
    </html>
  );
}
