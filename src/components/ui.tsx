import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-strong shadow-sm disabled:hover:bg-accent",
  secondary: "border border-border bg-card text-foreground hover:bg-background",
  ghost: "text-muted hover:text-foreground hover:bg-card",
  danger: "border border-border bg-card text-danger hover:bg-danger-soft",
};

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Notice({
  tone = "warning",
  children,
}: {
  tone?: "warning" | "danger";
  children: ReactNode;
}) {
  const styles =
    tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning";
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${styles}`}>
      <AlertIcon className="mt-0.5 shrink-0" width={16} height={16} />
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
