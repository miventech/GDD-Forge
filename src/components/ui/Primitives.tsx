import { cn } from "@/lib/utils";

type Color = "purple" | "teal" | "coral" | "amber" | "red";

export function Tag({
  children,
  color = "purple",
  className,
}: {
  children: React.ReactNode;
  color?: Color;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[12px] px-3 py-1 rounded-full font-medium",
        `bg-${color}-light text-${color}-dark`,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-bg-primary border border-line rounded-lg p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AccentCard({
  color = "purple",
  children,
  className,
}: {
  color?: Color;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-l-[3px] rounded-r-md rounded-l-none p-4 bg-bg-secondary",
        className
      )}
      style={{ borderLeftColor: `var(--${color}-mid)` }}
    >
      {children}
    </div>
  );
}
