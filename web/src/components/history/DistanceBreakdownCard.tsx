"use client";

import { Sparkles, SkipForward } from "lucide-react";
import type { DistanceBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHkCompact, formatRoi } from "./format";

interface DistanceBreakdownCardProps {
  rows: DistanceBreakdownView[];
}

export function DistanceBreakdownCard({ rows }: DistanceBreakdownCardProps) {
  const visibleRows = rows.filter((r) => r.bets > 0);
  const maxAbsRoi = visibleRows.reduce(
    (m, r) => Math.max(m, Math.abs(r.roi) * 100),
    0,
  ) || 1;

  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            距離 ROI 分佈
          </h4>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            <span className="inline-flex items-center gap-1 align-middle">
              <Sparkles className="h-3 w-3 text-precision-glow" aria-hidden />
              加成
            </span>
            {" · "}
            <span className="inline-flex items-center gap-1 align-middle">
              <SkipForward className="h-3 w-3 text-text-subtle" aria-hidden />
              跳過
            </span>
          </p>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyMini hint="暫無下注記錄" />
      ) : (
        <ul
          className="mt-4 grid grid-cols-1 gap-2"
          aria-label="按距離拆分"
        >
          {visibleRows.map((r) => {
            const roiPct = r.roi * 100;
            const barPct = Math.min(100, (Math.abs(roiPct) / maxAbsRoi) * 100);
            const positive = roiPct > 0;
            const negative = roiPct < 0;
            return (
              <li
                key={r.distance}
                className={cn(
                  "rounded-lg border p-2.5",
                  r.isV19Boost
                    ? "border-precision/30 bg-precision/[0.04]"
                    : r.isV19Skip
                      ? "border-border-subtle bg-bg-subtle/40 opacity-70"
                      : "border-border-subtle bg-bg-subtle/30",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold number-mono">
                    {r.distance}m
                    {r.isV19Boost && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-precision/30 bg-precision/15 px-1.5 py-0.5 text-[9px] font-medium text-precision-glow"
                        title="V19 加成距離 +1.5"
                      >
                        <Sparkles className="h-2.5 w-2.5" aria-hidden />
                        加成
                      </span>
                    )}
                    {r.isV19Skip && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-border-subtle bg-bg-subtle px-1.5 py-0.5 text-[9px] font-medium text-text-subtle"
                        title="V19 跳過距離"
                      >
                        <SkipForward className="h-2.5 w-2.5" aria-hidden />
                        跳過
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "number-mono text-[11px] font-bold",
                      positive && "text-precision-glow",
                      negative && "text-danger",
                      !positive && !negative && "text-text-muted",
                    )}
                  >
                    {formatRoi(r.roi)}
                  </span>
                </div>
                <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0",
                      positive && "bg-precision/70",
                      negative && "bg-danger/70",
                      !positive && !negative && "bg-border",
                    )}
                    style={{ width: `${barPct}%` }}
                    aria-hidden
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-text-subtle">
                  <span className="number-mono">
                    {r.judged}/{r.races} · 命中 {r.rate.toFixed(0)}%
                  </span>
                  <span className="number-mono">
                    {formatHkCompact(r.pnl, r.pnl !== 0)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
