import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  value: number;
  size?: "sm" | "md";
  className?: string;
}

export function ProbabilityBar({
  value,
  size = "sm",
  className,
}: ProbabilityBarProps) {
  const tier =
    value >= 18 ? "hot" : value >= 12 ? "strong" : value >= 8 ? "mid" : "cold";

  const labelClass = size === "md" ? "text-sm" : "text-xs";

  return (
    <span
      className={cn(
        "number-mono inline-block font-bold tabular-nums leading-none",
        labelClass,
        tier === "hot"
          ? "text-precision-glow"
          : tier === "strong"
            ? "text-text"
            : "text-text-muted",
        className,
      )}
      role="img"
      aria-label={`勝率 ${value.toFixed(1)}%`}
    >
      {value.toFixed(1)}
    </span>
  );
}
