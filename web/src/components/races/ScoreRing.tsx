import { cn } from "@/lib/utils";

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}

export function ScoreRing({
  value,
  max = 100,
  size = 28,
  className,
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / max);

  const tier = value >= 70 ? "hot" : value >= 40 ? "mid" : "cold";
  const stroke =
    tier === "hot"
      ? "stroke-precision"
      : tier === "mid"
        ? "stroke-precision/50"
        : "stroke-text-subtle/50";

  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`評分 ${value.toFixed(0)} / ${max}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-bg-subtle fill-none"
          strokeWidth={2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn("fill-none transition-[stroke-dashoffset] duration-500", stroke)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className={cn(
          "number-mono absolute text-[10px] font-black tabular-nums",
          tier === "hot"
            ? "text-precision-glow"
            : tier === "mid"
              ? "text-text"
              : "text-text-muted",
        )}
      >
        {value.toFixed(0)}
      </span>
    </span>
  );
}
