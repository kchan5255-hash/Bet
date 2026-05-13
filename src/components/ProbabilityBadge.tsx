import { cn } from "@/lib/utils";

interface ProbabilityBadgeProps {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function probTier(value: number): "hot" | "strong" | "mid" | "cold" {
  if (value >= 18) return "hot";
  if (value >= 12) return "strong";
  if (value >= 8) return "mid";
  return "cold";
}

export function ProbabilityBadge({
  value,
  size = "md",
  className,
}: ProbabilityBadgeProps) {
  const tier = probTier(value);
  const style = {
    hot: "bg-precision text-white",
    strong: "bg-yellow-500 text-bg",
    mid: "bg-bg-subtle text-text border border-border",
    cold: "bg-bg-subtle text-text-muted border border-border-subtle",
  }[tier];

  const sizeClass = {
    sm: "text-[11px] px-1 py-0.5 w-[46px]",
    md: "text-sm px-2 py-1 w-[56px]",
    lg: "text-base px-3 py-1.5 w-[68px]",
  }[size];

  return (
    <div
      className={cn(
        "number-mono inline-flex items-center justify-center rounded font-black text-center",
        style,
        sizeClass,
        className,
      )}
    >
      {value.toFixed(1)}
    </div>
  );
}

export function ScoreBadge({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    sm: "text-[11px] px-1 py-0.5 w-[36px]",
    md: "text-sm px-2 py-1 w-[44px]",
    lg: "text-base px-3 py-1.5 w-[52px]",
  }[size];

  return (
    <div
      className={cn(
        "number-mono inline-flex items-center justify-center rounded font-black bg-orange-500 text-white",
        sizeClass,
        className,
      )}
    >
      {value.toFixed(0)}
    </div>
  );
}
