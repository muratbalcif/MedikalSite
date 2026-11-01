"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isAdmin, loading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Giriş başarısız");
      }
    }
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#16324f] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(8,145,178,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.25), transparent 35%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.25em] text-[#1b6b8f]">
          ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-900">
          Admin Girişi
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          API üzerinden kimlik doğrulama. Admin rolü olmayan hesaplar
          reddedilir.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              E-posta
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-[#1b6b8f] focus:ring-2"
              {...register("email")}
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Şifre
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-[#1b6b8f] focus:ring-2"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#1b6b8f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16324f] disabled:opacity-60"
          >
            {isSubmitting ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>
    </main>
  );
}
