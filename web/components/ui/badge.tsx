import clsx from "clsx";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-surface-secondary text-text-secondary",
        tone === "success" && "bg-emerald-100 text-success",
        tone === "warning" && "bg-amber-100 text-warning",
        tone === "danger" && "bg-red-100 text-error",
        tone === "accent" && "bg-amber-100 text-primary-dark",
      )}
    >
      {children}
    </span>
  );
}
