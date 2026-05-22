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
  const pct = Math.max(0, Math.min(100, value));
  const tier =
    value >= 18 ? "hot" : value >= 12 ? "strong" : value >= 8 ? "mid" : "cold";

  const fillStyle = {
    hot: "ai-gradient",
    strong: "bg-precision",
    mid: "bg-precision/50",
    cold: "bg-text-subtle/40",
  }[tier];

  const heightClass = size === "md" ? "h-2" : "h-1.5";
  const labelClass = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="img"
      aria-label={`勝率 ${value.toFixed(1)}%`}
    >
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-bg-subtle",
          heightClass,
        )}
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", fillStyle)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "number-mono shrink-0 font-bold tabular-nums",
          labelClass,
          tier === "hot"
            ? "text-precision-glow"
            : tier === "strong"
              ? "text-text"
              : "text-text-muted",
        )}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}
