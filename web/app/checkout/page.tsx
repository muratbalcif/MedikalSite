"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientApiFetch } from "@/lib/api/client";
import { formatMoney } from "@/lib/money";
import { orderService } from "@/services/order.service";

type Address = {
  id: string;
  title: string;
  city: string;
  district: string;
  addressLine: string;
  isDefault: boolean;
};

type Cart = {
  items: Array<{
    product: { name: string };
    quantity: number;
    subtotal: string | null;
  }>;
  summary: { total: string; currency: string; subtotal: string };
};

type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  branch: string | null;
  currency: string;
  description: string | null;
};

function bankInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [shippingAddressId, setShippingAddressId] = useState("");
  const [billingAddressId, setBillingAddressId] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    title: "Ev",
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    district: "",
    addressLine: "",
  });

  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<string | null>(null);
  const [validatedTotal, setValidatedTotal] = useState<string | null>(null);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: () => clientApiFetch<Address[]>("/addresses"),
  });
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => clientApiFetch<Cart>("/cart"),
  });
  const banksQuery = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => clientApiFetch<BankAccount[]>("/payment/bank-accounts"),
  });

  const addresses = useMemo(
    () => addressesQuery.data ?? [],
    [addressesQuery.data],
  );
  const banks = banksQuery.data ?? [];
  const selectedBank = banks.find((b) => b.id === selectedBankId) ?? null;
  const currency = cartQuery.data?.summary.currency ?? "TRY";
  const payableAmount = cartQuery.data?.summary.total ?? "";

  async function validateCoupon() {
    setCouponMessage(null);
    setCouponDiscount(null);
    try {
      const result = await clientApiFetch<{
        valid: boolean;
        message?: string;
        discountAmount?: string;
      }>("/checkout/coupon/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode }),
      });
      if (!result.valid) {
        setCouponMessage(result.message ?? "Kupon geçersiz");
        return;
      }
      setCouponDiscount(result.discountAmount ?? null);
      setCouponMessage(result.message ?? "Kupon uygulandı");
    } catch (err) {
      setCouponMessage(
        err instanceof Error ? err.message : "Kupon doğrulanamadı",
      );
    }
  }

  async function saveAddress() {
    const created = await clientApiFetch<Address>("/addresses", {
      method: "POST",
      body: JSON.stringify(newAddress),
    });
    await addressesQuery.refetch();
    setShippingAddressId(created.id);
    setBillingAddressId(created.id);
  }

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  async function placeOrder() {
    if (!shippingAddressId) {
      setError("Teslimat adresi seçin");
      return;
    }
    if (!selectedBankId) {
      setError("Havale için bir banka hesabı seçin");
      return;
    }
    setCreating(true);
    setError(null);
    setValidatedTotal(null);
    try {
      const billingId = billingAddressId || shippingAddressId;
      const validation = (await orderService.validateCheckout({
        shippingAddressId,
        billingAddressId: billingId,
        couponCode: couponCode.trim() || undefined,
      })) as {
        valid: boolean;
        issues?: Array<{ message: string; code?: string }>;
        summary?: {
          total?: string;
          currency?: string;
          couponDiscount?: string;
        };
      };

      if (!validation.valid) {
        const detail =
          validation.issues?.map((i) => i.message).filter(Boolean).join(" · ") ||
          "Checkout doğrulaması başarısız";
        setError(detail);
        return;
      }

      if (validation.summary?.total) {
        setValidatedTotal(
          `${validation.summary.total} ${validation.summary.currency ?? "TRY"}`,
        );
      }
      if (validation.summary?.couponDiscount) {
        setCouponDiscount(validation.summary.couponDiscount);
      }

      const order = (await orderService.create({
        shippingAddressId,
        billingAddressId: billingId,
        couponCode: couponCode.trim() || undefined,
      })) as { id: string; orderNumber: string };
      const qs = new URLSearchParams({
        orderId: order.id,
        bankAccountId: selectedBankId,
      });
      router.push(`/checkout/success?${qs.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş oluşturulamadı");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
        Checkout
      </h1>
      <div className="flex gap-2 text-sm">
        <span className={step === 1 ? "font-semibold text-primary" : ""}>
          1. Adres
        </span>
        <span>→</span>
        <span className={step === 2 ? "font-semibold text-primary" : ""}>
          2. Ödeme
        </span>
        <span>→</span>
        <span className={step === 3 ? "font-semibold text-primary" : ""}>
          3. Onay
        </span>
      </div>

      {step === 1 ? (
        <section className="space-y-4 rounded-lg border bg-white p-4">
          <h2 className="font-semibold">Teslimat adresi</h2>
          {addresses.map((address) => (
            <label
              key={address.id}
              className="flex gap-2 rounded border p-3 text-sm"
            >
              <input
                type="radio"
                name="shipping"
                checked={shippingAddressId === address.id}
                onChange={() => {
                  setShippingAddressId(address.id);
                  setBillingAddressId(address.id);
                }}
              />
              <span>
                <strong>{address.title}</strong> — {address.addressLine},{" "}
                {address.district}/{address.city}
              </span>
            </label>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Ad"
              value={newAddress.firstName}
              onChange={(e) =>
                setNewAddress((s) => ({ ...s, firstName: e.target.value }))
              }
            />
            <Input
              placeholder="Soyad"
              value={newAddress.lastName}
              onChange={(e) =>
                setNewAddress((s) => ({ ...s, lastName: e.target.value }))
              }
            />
            <Input
              placeholder="Telefon"
              value={newAddress.phone}
              onChange={(e) =>
                setNewAddress((s) => ({ ...s, phone: e.target.value }))
              }
            />
            <Input
              placeholder="Şehir"
              value={newAddress.city}
              onChange={(e) =>
                setNewAddress((s) => ({ ...s, city: e.target.value }))
              }
            />
            <Input
              placeholder="İlçe"
              value={newAddress.district}
              onChange={(e) =>
                setNewAddress((s) => ({ ...s, district: e.target.value }))
              }
            />
            <Input
              placeholder="Adres"
              value={newAddress.addressLine}
              onChange={(e) =>
                setNewAddress((s) => ({ ...s, addressLine: e.target.value }))
              }
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void saveAddress()}
          >
            Yeni adres kaydet
          </Button>
          <Button
            type="button"
            disabled={!shippingAddressId}
            onClick={() => setStep(2)}
          >
            Devam
          </Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-lg border bg-white p-4">
          <h2 className="font-semibold">Ödeme yöntemi</h2>
          <label className="flex gap-2 text-sm font-medium">
            <input type="radio" checked readOnly />
            Havale / EFT
          </label>
          <p className="text-sm text-slate-600">
            İlk sürümde tek ödeme yöntemi havale/EFT&apos;dir. Online kart ödeme
            aktif değildir.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border bg-slate-50 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">Ödenecek tutar</p>
              <p className="font-medium">
                {payableAmount ? formatMoney(payableAmount, currency) : "—"}
              </p>
            </div>
            <div className="rounded border bg-slate-50 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">Kalan</p>
              <p className="font-medium">
                {payableAmount ? formatMoney(payableAmount, currency) : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sipariş sonrası kısmi ödeme yapılabilir.
              </p>
            </div>
          </div>

          <div className="rounded border border-dashed bg-white px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">Ödeme referansı</p>
            <p className="text-slate-600">
              Sipariş oluşturulunca atanır. Success ve &quot;Ödemeyi Yaptım&quot;
              ekranında kopyalayabilirsiniz.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Banka hesabı seçin</h3>
            {banksQuery.isLoading ? (
              <p className="text-sm text-slate-500">Hesaplar yükleniyor…</p>
            ) : banksQuery.isError ? (
              <p className="text-sm text-red-600">
                Banka hesapları yüklenemedi. Tekrar deneyin.
              </p>
            ) : banks.length === 0 ? (
              <p className="text-sm text-amber-700">
                Aktif banka hesabı bulunamadı. Lütfen destek ile iletişime
                geçin.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {banks.map((bank) => {
                  const selected = selectedBankId === bank.id;
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-[#1b6b8f] bg-[#1b6b8f]/5 ring-2 ring-[#1b6b8f]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                            selected
                              ? "bg-[#1b6b8f] text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {bankInitials(bank.bankName)}
                        </span>
                        <div>
                          <p className="font-semibold text-navy">
                            {bank.bankName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {bank.accountName}
                          </p>
                        </div>
                      </div>
                      <p className="font-mono text-sm break-all">{bank.iban}</p>
                      {bank.branch ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Şube: {bank.branch}
                        </p>
                      ) : null}
                      <div
                        className="mt-2 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-2 text-xs"
                          onClick={() =>
                            void copyValue(`iban-${bank.id}`, bank.iban)
                          }
                        >
                          {copiedKey === `iban-${bank.id}`
                            ? "Kopyalandı"
                            : "IBAN Kopyala"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-2 text-xs"
                          onClick={() =>
                            void copyValue(`name-${bank.id}`, bank.accountName)
                          }
                        >
                          {copiedKey === `name-${bank.id}`
                            ? "Kopyalandı"
                            : "Hesap sahibi"}
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-600">
              Listelenen hesaplardan herhangi birine kendi bankanızdan
              EFT/havale yapabilirsiniz.
            </p>
          </div>

          {selectedBank ? (
            <div className="rounded-md border border-[#1b6b8f]/30 bg-[#1b6b8f]/5 p-3 text-sm">
              <p className="font-semibold text-[#1b6b8f]">Seçilen hesap</p>
              <p>
                {selectedBank.bankName} · {selectedBank.accountName}
              </p>
              <p className="font-mono text-xs break-all">{selectedBank.iban}</p>
            </div>
          ) : (
            <p className="text-sm font-medium text-amber-800">
              Devam etmek için bir banka hesabı seçin.
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Geri
            </Button>
            <Button
              type="button"
              disabled={!selectedBankId || banks.length === 0}
              onClick={() => setStep(3)}
            >
              Devam
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-lg border bg-white p-4">
          <h2 className="font-semibold">Sipariş özeti</h2>
          <ul className="space-y-2 text-sm">
            {cartQuery.data?.items.map((item, index) => (
              <li key={index}>
                {item.product.name} × {item.quantity} — {item.subtotal}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Kupon kodunuz"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="max-w-xs uppercase"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void validateCoupon()}
            >
              Uygula
            </Button>
          </div>
          {couponMessage ? (
            <p className="text-sm text-slate-600">{couponMessage}</p>
          ) : null}
          {couponDiscount ? (
            <p className="text-sm text-emerald-700">
              Kupon indirimi (sunucu): {couponDiscount} TRY
            </p>
          ) : null}
          <p className="font-semibold">
            Toplam:{" "}
            {validatedTotal ??
              (payableAmount ? formatMoney(payableAmount, currency) : "—")}
          </p>
          <p className="text-sm text-slate-600">Ödeme: Havale / EFT</p>
          {selectedBank ? (
            <div className="rounded border bg-slate-50 p-3 text-sm">
              <p className="font-medium text-[#1b6b8f]">Seçilen banka</p>
              <p>
                {selectedBank.bankName} · {selectedBank.accountName}
              </p>
              <p className="font-mono text-xs">{selectedBank.iban}</p>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">
            Sipariş sonrası ödeme referansı oluşturulur. Success ekranından
            &quot;Ödemeyi Yaptım&quot; ile claim gönderebilir; kısmi tutar
            girebilirsiniz.
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Geri
            </Button>
            <Button
              type="button"
              disabled={creating || !selectedBankId}
              onClick={() => void placeOrder()}
              className="bg-[#1b6b8f] hover:bg-[#16324f]"
            >
              {creating ? "Oluşturuluyor…" : "Siparişi Oluştur"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
