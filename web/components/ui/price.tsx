import { formatMoney, shouldShowCompareAt } from "@/lib/money";

export function Price({
  amount,
  currency = "TRY",
  compareAt,
}: {
  amount: string;
  currency?: string;
  compareAt?: string | null;
}) {
  const discounted = shouldShowCompareAt(amount, compareAt);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={
          discounted
            ? "text-lg font-bold text-primary-dark"
            : "text-lg font-bold text-foreground"
        }
      >
        {formatMoney(amount, currency)}
      </span>
      {discounted ? (
        <span className="text-sm text-muted line-through">
          {formatMoney(compareAt!, currency)}
        </span>
      ) : null}
    </div>
  );
}
