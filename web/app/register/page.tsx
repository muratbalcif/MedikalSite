"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/base";

const schema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, "En az 8 karakter"),
    passwordConfirm: z.string().min(8),
    userType: z.enum(["INDIVIDUAL", "CORPORATE"]),
    companyName: z.string().optional(),
    taxNumber: z.string().optional(),
    taxOffice: z.string().optional(),
    identityNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Şifreler eşleşmiyor",
    path: ["passwordConfirm"],
  })
  .superRefine((data, ctx) => {
    if (data.userType === "CORPORATE") {
      if (!data.companyName) {
        ctx.addIssue({ code: "custom", message: "Zorunlu", path: ["companyName"] });
      }
      if (!data.taxNumber) {
        ctx.addIssue({ code: "custom", message: "Zorunlu", path: ["taxNumber"] });
      }
      if (!data.taxOffice) {
        ctx.addIssue({ code: "custom", message: "Zorunlu", path: ["taxOffice"] });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userType: "INDIVIDUAL" },
  });
  const userType = watch("userType");

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        userType: values.userType,
        companyName: values.companyName,
        taxNumber: values.taxNumber,
        taxOffice: values.taxOffice,
        identityNumber: values.identityNumber,
      };
      await authClient.register(payload);
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
    }
  });

  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-white p-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-navy">
        Kayıt ol
      </h1>
      <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Ad" {...register("firstName")} />
          <Input placeholder="Soyad" {...register("lastName")} />
        </div>
        <Input type="email" placeholder="E-posta" {...register("email")} />
        <Input placeholder="Telefon" {...register("phone")} />
        <Input type="password" placeholder="Şifre (en az 8 karakter)" {...register("password")} />
        {errors.password ? (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        ) : null}
        <Input
          type="password"
          placeholder="Şifre tekrar"
          {...register("passwordConfirm")}
        />
        {errors.passwordConfirm ? (
          <p className="text-sm text-red-600">{errors.passwordConfirm.message}</p>
        ) : null}
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("userType")}
        >
          <option value="INDIVIDUAL">Bireysel</option>
          <option value="CORPORATE">Kurumsal</option>
        </select>
        {userType === "CORPORATE" ? (
          <div className="space-y-3 rounded border border-slate-200 p-3">
            <Input placeholder="Firma adı" {...register("companyName")} />
            <Input placeholder="Vergi no" {...register("taxNumber")} />
            <Input placeholder="Vergi dairesi" {...register("taxOffice")} />
            <Input placeholder="Kimlik no (opsiyonel)" {...register("identityNumber")} />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          Kayıt ol
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-primary">
          Giriş
        </Link>
      </p>
    </div>
  );
}
