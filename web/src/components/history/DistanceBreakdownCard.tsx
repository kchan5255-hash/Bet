"use client";

import type { DistanceBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHkCompact, formatRoi } from "./format";

interface DistanceBreakdownCardProps {
  rows: DistanceBreakdownView[];
}

export function DistanceBreakdownCard({ rows }: DistanceBreakdownCardProps) {
  const visibleRows = rows.filter((r) => r.bets > 0);

  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        距離 ROI 分佈
      </h4>
      <p className="mt-0.5 text-[11px] text-text-subtle">按距離拆分</p>

      {visibleRows.length === 0 ? (
        <EmptyMini hint="暫無下注記錄" />
      ) : (
        <ul
          className="mt-4 grid grid-cols-1 gap-2"
          aria-label="按距離拆分"
        >
          {visibleRows.map((r) => {
            const positive = r.pnl > 0;
            const negative = r.pnl < 0;
            return (
              <li
                key={r.distance}
                className="rounded-lg border border-border-subtle bg-bg-subtle/30 p-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="font-semibold number-mono">
                    {r.distance}m
                  </span>
                  <span className="text-text-subtle number-mono text-[10px]">
                    {r.judged}/{r.races}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Stat
                    label="ROI"
                    value={formatRoi(r.roi)}
                    valueClass={cn(
                      positive && "text-precision-glow",
                      negative && "text-danger",
                      !positive && !negative && "text-text-muted",
                    )}
                  />
                  <Stat label="命中" value={`${r.rate.toFixed(0)}%`} />
                  <Stat
                    label="盈虧"
                    value={formatHkCompact(r.pnl, r.pnl !== 0)}
                    align="right"
                    valueClass={cn(
                      positive && "text-precision-glow",
                      negative && "text-danger",
                      !positive && !negative && "text-text-muted",
                    )}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
  align = "left",
}: {
  label: string;
  value: string;
  valueClass?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", align === "right" && "items-end")}>
      <span className="text-[9px] uppercase tracking-wider text-text-subtle">
        {label}
      </span>
      <span className={cn("number-mono text-[12px] font-bold", valueClass)}>
        {value}
      </span>
    </div>
  );
}

function EmptyMini({ hint }: { hint: string }) {
  return (
    <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-border-subtle text-[11px] text-text-subtle">
      {hint}
    </div>
  );
}
