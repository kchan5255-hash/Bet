"use client";

import type { PoolBreakdownView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHk, formatRoi } from "./format";

interface PoolBreakdownCardProps {
  pool: PoolBreakdownView;
}

export function PoolBreakdownCard({ pool }: PoolBreakdownCardProps) {
  return (
    <div className="bento-card bento-card-hover p-5 md:p-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        投注池對比
      </h4>
      <p className="mt-0.5 text-[11px] text-text-subtle">連贏 vs 位置Q</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <PoolPanel label="連贏" hint="Quinella" data={pool.qin} accent="precision" />
        <PoolPanel label="位置Q" hint="Quinella Place" data={pool.qinQ} accent="upset" />
      </div>
    </div>
  );
}

function PoolPanel({
  label,
  hint,
  data,
  accent,
}: {
  label: string;
  hint: string;
  data: PoolBreakdownView["qin"];
  accent: "precision" | "upset";
}) {
  const positive = data.pnl > 0;
  const negative = data.pnl < 0;
  const winRate = data.bets > 0 ? (data.wins / data.bets) * 100 : 0;
  const accentMap = {
    precision: "border-precision/25 from-precision/15 to-transparent",
    upset: "border-upset/25 from-upset/15 to-transparent",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-3",
        accentMap[accent],
      )}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] font-bold">{label}</div>
          <div className="text-[9px] uppercase tracking-wider text-text-subtle">
            {hint}
          </div>
        </div>
        <span
          className={cn(
            "number-mono text-xs font-bold",
            positive && "text-precision-glow",
            negative && "text-danger",
            !positive && !negative && "text-text-muted",
          )}
        >
          {formatRoi(data.roi)}
        </span>
      </div>
      <div
        className={cn(
          "mt-2 number-mono text-xl font-black md:text-2xl",
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text",
        )}
      >
        {formatHk(data.pnl, true)}
      </div>
      <div className="mt-2 space-y-0.5 text-[10px] text-text-subtle">
        <div className="flex justify-between">
          <span>勝率</span>
          <span className="number-mono">
            {winRate.toFixed(1)}% ({data.wins}/{data.bets})
          </span>
        </div>
        <div className="flex justify-between">
          <span>投注</span>
          <span className="number-mono">{formatHk(data.stake)}</span>
        </div>
        <div className="flex justify-between">
          <span>回報</span>
          <span className="number-mono">{formatHk(data.ret)}</span>
        </div>
      </div>
    </div>
  );
}
