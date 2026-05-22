"use client";

import type { VenueBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHk, formatRoi, venueLabel } from "./format";

interface VenueBreakdownCardProps {
  rows: VenueBreakdownView[];
}

export function VenueBreakdownCard({ rows }: VenueBreakdownCardProps) {
  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        場地對比
      </h4>
      <p className="mt-0.5 text-[11px] text-text-subtle">沙田 vs 跑馬地表現</p>

      {rows.length === 0 ? (
        <EmptyMini hint="暫無場地資料" />
      ) : (
        <ul className="mt-4 space-y-2.5" aria-label="按場地拆分">
          {rows.map((r) => {
            const positive = r.pnl > 0;
            const negative = r.pnl < 0;
            const isST = r.venue === "ST";
            return (
              <li
                key={r.venue}
                className="rounded-lg border border-border-subtle bg-bg-subtle/30 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                    <VenueGlyph isST={isST} />
                    {venueLabel(r.venue)}
                    <span className="text-text-subtle number-mono text-[10px]">
                      {r.judged}/{r.races}
                    </span>
                  </span>
                </div>
                <StatRow
                  roi={r.roi}
                  rate={r.rate}
                  pnl={r.pnl}
                  positive={positive}
                  negative={negative}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VenueGlyph({ isST }: { isST: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 rounded-sm",
        isST
          ? "bg-precision shadow-[0_0_4px_rgba(52,211,153,0.6)]"
          : "bg-upset shadow-[0_0_4px_rgba(139,92,246,0.6)]",
      )}
    />
  );
}

function StatRow({
  roi,
  rate,
  pnl,
  positive,
  negative,
}: {
  roi: number;
  rate: number;
  pnl: number;
  positive: boolean;
  negative: boolean;
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      <Stat
        label="ROI"
        value={formatRoi(roi)}
        valueClass={cn(
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text-muted",
        )}
      />
      <Stat label="命中" value={`${rate.toFixed(0)}%`} />
      <Stat
        label="盈虧"
        value={formatHk(pnl, true)}
        align="right"
        valueClass={cn(
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text-muted",
        )}
      />
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
