import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { canDiscount, canRefund } from "../../api/permissions";
import { friendlyErrorMessage } from "../../api/http";
import { createSale, lookupProducts } from "../../api/pos";
import { BarcodeInput } from "../../components/BarcodeInput";
import { CartPanel } from "../../components/CartPanel";
import { CustomerModal } from "../../components/CustomerModal";
import { DiscountModal } from "../../components/DiscountModal";
import { PaymentModal } from "../../components/PaymentModal";
import { ProductPickModal } from "../../components/ProductPickModal";
import { ReturnModal } from "../../components/ReturnModal";
import { SaleSuccessModal } from "../../components/SaleSuccessModal";
import { Toast } from "../../components/Toast";
import { usePosStore } from "../../store/pos-store";
import type { AuthUser, PosProductLookup, PosSale } from "../../types/api";
import { createIdempotencyKey } from "../../utils/idempotency";
import { money } from "../../utils/money";

export function PosPage({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [pickProducts, setPickProducts] = useState<PosProductLookup[] | null>(
    null,
  );
  const [successSale, setSuccessSale] = useState<PosSale | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const registerId = usePosStore((s) => s.registerId);
  const registerLabel = usePosStore((s) => s.registerLabel);
  const cart = usePosStore((s) => s.cart);
  const customer = usePosStore((s) => s.customer);
  const selectedLineId = usePosStore((s) => s.selectedLineId);
  const addProduct = usePosStore((s) => s.addProduct);
  const increment = usePosStore((s) => s.increment);
  const decrement = usePosStore((s) => s.decrement);
  const removeLine = usePosStore((s) => s.removeLine);
  const selectLine = usePosStore((s) => s.selectLine);
  const estimatedTotal = usePosStore((s) => s.estimatedTotal);
  const resetSale = usePosStore((s) => s.resetSale);
  const cartDiscountAmount = usePosStore((s) => s.cartDiscountAmount);
  const cartDiscountPercent = usePosStore((s) => s.cartDiscountPercent);

  const focusBarcode = useCallback(() => {
    barcodeRef.current?.focus();
    barcodeRef.current?.select();
  }, []);

  useEffect(() => {
    focusBarcode();
  }, [focusBarcode]);

  const lookupMutation = useMutation({
    mutationFn: (q: string) => lookupProducts(q, customer?.id),
    onSuccess: (results, q) => {
      if (results.length === 0) {
        setToast(`Ürün bulunamadı: ${q}`);
        focusBarcode();
        return;
      }
      if (results.length === 1) {
        const p = results[0]!;
        if (!p.unitPrice) {
          setToast("Ürün için fiyat bulunamadı");
          return;
        }
        addProduct(p);
        focusBarcode();
        return;
      }
      setPickProducts(results);
    },
    onError: (err) => setToast(friendlyErrorMessage(err)),
  });

  const modalOpen =
    customerOpen ||
    discountOpen ||
    paymentOpen ||
    returnOpen ||
    !!pickProducts ||
    !!successSale;

  const closeModals = useCallback(() => {
    setCustomerOpen(false);
    setDiscountOpen(false);
    setPaymentOpen(false);
    setReturnOpen(false);
    setPickProducts(null);
    focusBarcode();
  }, [focusBarcode]);

  const openProduct = useCallback(() => {
    focusBarcode();
  }, [focusBarcode]);

  const openCustomer = useCallback(() => {
    setCustomerOpen(true);
  }, []);

  const openDiscount = useCallback(() => {
    if (!canDiscount(user)) {
      setToast("İndirim yetkisi yok (pos.discount)");
      return;
    }
    setDiscountOpen(true);
  }, [user]);

  const openPayment = useCallback(() => {
    if (cart.length === 0) {
      setToast("Sepet boş");
      return;
    }
    setPaymentOpen(true);
  }, [cart.length]);

  const openReturn = useCallback(() => {
    if (!canRefund(user)) {
      setToast("İade yetkisi yok (pos.refund)");
      return;
    }
    setReturnOpen(true);
  }, [user]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (modalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeModals();
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "F2") {
        e.preventDefault();
        openProduct();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        openCustomer();
        return;
      }
      if (e.key === "F6") {
        e.preventDefault();
        openDiscount();
        return;
      }
      if (e.key === "F8" || e.key === "F12") {
        e.preventDefault();
        openPayment();
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        openReturn();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeModals();
        return;
      }

      if (typing && target !== barcodeRef.current) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLineId && target === barcodeRef.current && !(barcodeRef.current?.value)) {
          e.preventDefault();
          removeLine(selectedLineId);
        } else if (selectedLineId && !typing) {
          e.preventDefault();
          removeLine(selectedLineId);
        }
        return;
      }
      if (!typing && (e.key === "+" || e.key === "=") && selectedLineId) {
        e.preventDefault();
        increment(selectedLineId);
      }
      if (!typing && e.key === "-" && selectedLineId) {
        e.preventDefault();
        decrement(selectedLineId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    modalOpen,
    selectedLineId,
    focusBarcode,
    increment,
    decrement,
    removeLine,
    closeModals,
    openProduct,
    openCustomer,
    openDiscount,
    openPayment,
    openReturn,
  ]);

  async function completeSale(
    payments: Array<{ method: "CASH" | "CARD" | "BANK_TRANSFER" | "ON_ACCOUNT"; amount: number }>,
  ) {
    if (!registerId || submitting) return;
    if (cart.length === 0) {
      setToast("Sepet boş");
      return;
    }
    const hasOnAccount = payments.some((p) => p.method === "ON_ACCOUNT");
    if (hasOnAccount && !customer) {
      setToast("Veresiye için müşteri seçimi zorunlu");
      return;
    }

    setSubmitting(true);
    const key = createIdempotencyKey();
    try {
      const body = {
        registerId,
        customerId: customer?.id ?? null,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          discountAmount: money(c.lineDiscount).toNumber(),
        })),
        payments,
        ...(money(cartDiscountAmount).greaterThan(0)
          ? { cartDiscountAmount: money(cartDiscountAmount).toNumber() }
          : {}),
        ...(money(cartDiscountPercent).greaterThan(0)
          ? { cartDiscountPercent: money(cartDiscountPercent).toNumber() }
          : {}),
      };
      const sale = await createSale(body, key);
      setPaymentOpen(false);
      setSuccessSale(sale);
      resetSale();
    } catch (err) {
      setToast(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary)] px-5 py-3 text-white">
        <div>
          <p className="text-lg font-bold tracking-tight">FURKAN SOĞUTMA POS</p>
          <p className="text-sm text-[#f0f5f8]">
            Kasa: {registerLabel ?? "—"} · {user.firstName} {user.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25"
            onClick={() => setCustomerOpen(true)}
          >
            {customer ? customer.name : "Misafir"}
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25"
            onClick={onLogout}
          >
            Çıkış
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,0.9fr)_minmax(520px,1.4fr)]">
        <section className="flex min-h-0 flex-col border-r border-[var(--border)] bg-white p-4">
          <BarcodeInput
            ref={barcodeRef}
            disabled={lookupMutation.isPending}
            onSubmit={(q) => lookupMutation.mutate(q)}
          />
          <SearchHints
            customerId={customer?.id}
            onPick={(p) => {
              addProduct(p);
              focusBarcode();
            }}
          />
        </section>

        <CartPanel
          total={estimatedTotal()}
          onPay={() => setPaymentOpen(true)}
          onSelect={selectLine}
          selectedId={selectedLineId}
          onInc={increment}
          onDec={decrement}
          onRemove={removeLine}
        />
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-[var(--border)] bg-white px-4 py-3 text-sm">
        <ShortcutButton keys="F2" label="Ürün" onClick={openProduct} />
        <ShortcutButton keys="F4" label="Müşteri" onClick={openCustomer} />
        <ShortcutButton keys="F6" label="İskonto" onClick={openDiscount} />
        <ShortcutButton keys="F8" label="Ödeme" onClick={openPayment} />
        <ShortcutButton keys="F9" label="İade" onClick={openReturn} />
        <ShortcutButton keys="F12" label="Satış" onClick={openPayment} />
        <ShortcutButton keys="ESC" label="Kapat" onClick={closeModals} />
      </footer>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}

      {customerOpen ? (
        <CustomerModal
          onClose={() => {
            setCustomerOpen(false);
            focusBarcode();
          }}
        />
      ) : null}
      {discountOpen ? (
        <DiscountModal
          onClose={() => {
            setDiscountOpen(false);
            focusBarcode();
          }}
        />
      ) : null}
      {paymentOpen ? (
        <PaymentModal
          total={estimatedTotal()}
          submitting={submitting}
          hasCustomer={!!customer}
          onClose={() => {
            if (!submitting) {
              setPaymentOpen(false);
              focusBarcode();
            }
          }}
          onConfirm={(payments) => void completeSale(payments)}
        />
      ) : null}
      {returnOpen ? (
        <ReturnModal
          onClose={() => {
            setReturnOpen(false);
            focusBarcode();
          }}
          onDone={(message) => setToast(message)}
        />
      ) : null}
      {pickProducts ? (
        <ProductPickModal
          products={pickProducts}
          onPick={(p) => {
            addProduct(p);
            setPickProducts(null);
            focusBarcode();
          }}
          onClose={() => {
            setPickProducts(null);
            focusBarcode();
          }}
        />
      ) : null}
      {successSale ? (
        <SaleSuccessModal
          sale={successSale}
          onNewSale={() => {
            setSuccessSale(null);
            focusBarcode();
          }}
        />
      ) : null}
    </div>
  );
}

function ShortcutButton({
  keys,
  label,
  onClick,
}: {
  keys: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 transition-colors hover:bg-[#d9e8ef] hover:ring-2 hover:ring-[var(--primary)]/30 active:bg-[#d9e8ef]"
    >
      <kbd className="pointer-events-none rounded bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-white">
        {keys}
      </kbd>
      <span className="font-medium text-slate-700">{label}</span>
    </button>
  );
}

function SearchHints({
  customerId,
  onPick,
}: {
  customerId?: string;
  onPick: (p: PosProductLookup) => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["pos-lookup", debounced, customerId],
    queryFn: () => lookupProducts(debounced, customerId),
    enabled: debounced.length >= 2,
  });

  return (
    <div className="mt-4 min-h-0 flex-1 overflow-auto">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Manuel arama
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ürün adı / SKU"
          className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </label>
      <ul className="mt-3 space-y-1">
        {(query.data ?? []).slice(0, 12).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[var(--primary-light)]"
              onClick={() => onPick(p)}
              disabled={!p.unitPrice}
            >
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-slate-500">{p.sku}</span>
              </span>
              <span className="text-sm font-semibold text-[var(--primary)]">
                {p.unitPrice ?? "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
