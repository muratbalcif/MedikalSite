"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import {
  POS_WINDOWS_DOWNLOAD_URL,
  POS_WINDOWS_RELEASES_URL,
  POS_WINDOWS_SETUP_FILENAME,
} from "@/lib/pos-download";

export default function PosWindowsDownloadPage() {
  return (
    <RequireAuth>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 p-8">
        <div>
          <p className="text-sm font-semibold text-[#1b6b8f]">Anamur Acil Medikal POS</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Windows uygulamasını indir
          </h1>
          <p className="mt-3 text-slate-600">
            Masaüstü kasa için NSIS kurulum dosyasını indirin. Tarayıcı POS için{" "}
            <Link href="/pos" className="font-medium text-[#1b6b8f] underline">
              /pos
            </Link>{" "}
            sayfasını kullanabilirsiniz.
          </p>
        </div>

        <a
          href={POS_WINDOWS_DOWNLOAD_URL}
          className="inline-flex items-center justify-center rounded-xl bg-[#1b6b8f] px-6 py-4 text-center text-lg font-semibold text-white hover:bg-[#16324f]"
        >
          {POS_WINDOWS_SETUP_FILENAME} indir
        </a>

        <p className="text-sm text-slate-500">
          Kurulum dosyası şu an imzasızdır (SmartScreen uyarısı çıkabilir). Tüm
          sürümler:{" "}
          <a
            href={POS_WINDOWS_RELEASES_URL}
            className="font-medium text-[#1b6b8f] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Releases
          </a>
        </p>

        <Link
          href="/pos"
          className="text-sm font-medium text-slate-700 underline"
        >
          ← POS satış ekranına dön
        </Link>
      </div>
    </RequireAuth>
  );
}
