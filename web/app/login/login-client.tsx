"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  password: z.string().min(8, "En az 8 karakter"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await authClient.login(values.email, values.password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş başarısız");
    }
  });

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-navy">
        Giriş
      </h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="mb-1 block text-sm" htmlFor="email">
            E-posta
          </label>
          <Input id="email" type="email" autoComplete="username" {...register("email")} />
          {errors.email ? (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm" htmlFor="password">
            Şifre
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Giriş…" : "Giriş yap"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Hesabınız yok mu?{" "}
        <Link href="/register" className="text-primary">
          Kayıt ol
        </Link>
      </p>
      <p className="mt-2 text-sm">
        <Link href="/forgot-password" className="text-slate-500">
          Şifremi unuttum
        </Link>
      </p>
    </div>
  );
}
