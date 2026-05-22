import { cn } from "@/lib/utils";
import type { RaceTier } from "@/lib/race-view-types";

type Size = "xs" | "sm" | "md";

interface TierBadgeProps {
  tier: RaceTier | null;
  size?: Size;
  showLabel?: boolean;
  className?: string;
}

const TIER_GLYPH: Record<RaceTier, string> = {
  S: "✓",
  A: "✓",
  B: "·",
  skip: "—",
};

const TIER_LABEL: Record<RaceTier, string> = {
  S: "Tier S",
  A: "Tier A",
  B: "Tier B",
  skip: "V19 跳過",
};

const TIER_SHORT: Record<RaceTier, string> = {
  S: "S",
  A: "A",
  B: "B",
  skip: "—",
};

const UNIFIED_STYLE = "bg-precision/15 text-precision-glow border-precision/40";

const TIER_STYLE: Record<RaceTier, string> = {
  S: UNIFIED_STYLE,
  A: UNIFIED_STYLE,
  B: UNIFIED_STYLE,
  skip: "bg-bg-subtle text-text-subtle border-dashed border-border-subtle",
};

const SIZE_STYLE: Record<Size, string> = {
  xs: "h-4 px-1 text-[9px] gap-0.5",
  sm: "h-5 px-1.5 text-[10px] gap-1",
  md: "h-6 px-2 text-[11px] gap-1",
};

export function TierBadge({
  tier,
  size = "sm",
  showLabel = false,
  className,
}: TierBadgeProps) {
  if (!tier) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wider",
        TIER_STYLE[tier],
        SIZE_STYLE[size],
        className,
      )}
      aria-label={TIER_LABEL[tier]}
    >
      <span aria-hidden>{TIER_GLYPH[tier]}</span>
      <span>{showLabel ? TIER_LABEL[tier] : TIER_SHORT[tier]}</span>
    </span>
  );
}

export { TIER_LABEL };
