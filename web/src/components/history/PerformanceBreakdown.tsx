"use client";

import type { BetMode, HistoryBreakdownView } from "@/lib/history-view-types";
import { strategyLabel } from "./format";
import { DistanceBreakdownCard } from "./DistanceBreakdownCard";
import { PoolBreakdownCard } from "./PoolBreakdownCard";
import { TierBreakdownCard } from "./TierBreakdownCard";
import { VenueBreakdownCard } from "./VenueBreakdownCard";

interface PerformanceBreakdownProps {
  mode: BetMode;
  breakdown: HistoryBreakdownView;
}

export function PerformanceBreakdown({ mode, breakdown }: PerformanceBreakdownProps) {
  return (
    <section
      aria-labelledby="performance-breakdown-title"
      className="space-y-3 md:space-y-4"
    >
      <div className="flex items-end justify-between">
        <div>
          <h3
            id="performance-breakdown-title"
            className="text-sm font-bold uppercase tracking-widest text-text-muted"
          >
            表現拆解
          </h3>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            {strategyLabel(mode)} · 場地 / 距離 / Tier / 投注池
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <VenueBreakdownCard rows={breakdown.byVenue} />
        <DistanceBreakdownCard rows={breakdown.byDistance} />
        <TierBreakdownCard rows={breakdown.byTier} />
        <PoolBreakdownCard pool={breakdown.byPool} />
      </div>
    </section>
  );
}
