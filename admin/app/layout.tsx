import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ | Yönetim",
  description: "Anamur Acil Medikal ve Anamur İşitme Merkezi yönetim paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
