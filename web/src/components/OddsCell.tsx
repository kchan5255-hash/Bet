import { cn } from "@/lib/utils";

interface OddsCellProps {
  value: number | null | undefined;
  kind: "win" | "place";
  favourite?: boolean;
  size?: "sm" | "md";
}

export function OddsCell({
  value,
  kind,
  favourite,
  size = "md",
}: OddsCellProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const display = hasValue ? formatOdds(value!) : "—";

  const sizeClass = {
    sm: "text-[11px] px-1 py-0.5 w-[40px]",
    md: "text-sm px-1.5 py-0.5 w-[48px]",
  }[size];

  return (
    <span
      className={cn(
        "number-mono inline-flex items-center justify-center rounded font-bold tabular-nums",
        sizeClass,
        favourite
          ? kind === "win"
            ? "bg-danger text-white"
            : "bg-orange-500 text-white"
          : hasValue
            ? "text-text bg-bg-subtle border border-border-subtle"
            : "text-text-subtle",
      )}
    >
      {display}
    </span>
  );
}

function formatOdds(n: number) {
  if (n < 100) return n.toFixed(n % 1 === 0 ? 0 : 1);
  return Math.round(n).toString();
}
