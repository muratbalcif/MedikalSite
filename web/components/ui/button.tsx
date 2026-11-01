import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-[11px] font-semibold transition disabled:opacity-50",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-5 py-3 text-base",
        variant === "primary" &&
          "bg-primary text-white hover:bg-primary-dark",
        variant === "accent" &&
          "bg-accent text-white hover:bg-accent-dark hover:text-white",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-secondary",
        variant === "ghost" && "text-text-secondary hover:bg-surface-secondary",
        variant === "danger" && "bg-error text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}
