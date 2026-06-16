import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-purple text-white hover:bg-purple-dark dark:bg-purple dark:hover:bg-purple-dark",
  secondary:
    "bg-bg-secondary text-ink-primary border border-line hover:bg-bg-tertiary",
  ghost: "text-ink-secondary hover:bg-bg-secondary hover:text-ink-primary",
  danger: "bg-red text-white hover:bg-red-dark",
  outline:
    "bg-transparent text-ink-primary border border-line-strong hover:bg-bg-secondary",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
      ) : null}
      {children}
    </button>
  );
});
