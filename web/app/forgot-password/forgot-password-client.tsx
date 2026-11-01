"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/base";

const schema = z.object({
  email: z.string().email("Geçerli e-posta girin"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordClient() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);
    try {
      const result = await authClient.forgotPassword(values.email);
      setMessage(result.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Şifre sıfırlama isteği başarısız",
      );
    }
  });

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-navy">
        Şifremi unuttum
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        E-posta adresinizi girin. Talep kaydedilir; sıfırlama bağlantısı ancak
        e-posta altyapısı yapılandırıldığında gönderilir. Yapılandırma yoksa
        e-posta gitmez.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="mb-1 block text-sm" htmlFor="email">
            E-posta
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? (
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Gönderiliyor…" : "Talep gönder"}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-primary">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
