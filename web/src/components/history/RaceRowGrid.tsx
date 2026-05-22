"use client";

import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { BetMode, HistoryRaceView, TierKey } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHk, strategyLabel, tierLabel } from "./format";
import { StatusBadge } from "./StatusBadge";

interface RaceRowGridProps {
  race: HistoryRaceView;
  mode: BetMode;
}

function rowAccent(race: HistoryRaceView, hasBet: boolean): string {
  if (hasBet) return "border-l-2 border-warning/70 bg-warning/[0.06]";
  if (!race.judged) return "border-l-2 border-border-subtle";
  if (race.hit) return "border-l-2 border-precision/40 bg-precision/[0.04]";
  return "border-l-2 border-transparent bg-bg-subtle/30";
}

const TIER_BADGE: Record<TierKey, string> = {
  S: "border-precision/30 bg-precision/15 text-precision-glow",
  A: "border-ai-start/30 bg-ai-start/15 text-text",
  B: "border-warning/30 bg-warning/10 text-warning",
  none: "border-border-subtle bg-bg-subtle text-text-subtle",
};

export function RaceRowGrid({ race, mode }: RaceRowGridProps) {
  const pnl = mode === "banker" ? race.bankerPnl : race.crossPnl;
  const positive = pnl.pnl > 0;
  const negative = pnl.pnl < 0;
  const accent = rowAccent(race, pnl.hasBet);

  return (
    <article
      aria-label={`R${race.raceNo} ${race.className}${race.distance ? ` ${race.distance}m` : ""} ${race.judged ? (race.hit ? "命中" : "未中") : "待定"}`}
      className={cn(
        "relative px-3 py-3 transition-colors hover:bg-bg-elevated/40 md:px-5",
        accent,
      )}
    >
      <div className="grid grid-cols-12 gap-x-3 gap-y-2 md:gap-x-4">
        <div className="col-span-2 md:col-span-1 flex items-start">
          <div
            className={cn(
              "number-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold",
              pnl.hasBet
                ? "border border-warning/40 bg-warning/15 text-warning"
                : race.judged && race.hit
                  ? "border border-precision/30 bg-precision/15 text-precision-glow"
                  : race.judged && !race.hit
                    ? "border border-danger/30 bg-danger/10 text-danger"
                    : "border border-border-subtle bg-bg-subtle text-text-muted",
            )}
          >
            R{race.raceNo}
          </div>
        </div>

        <div className="col-span-10 md:col-span-3 min-w-0">
          <div className="text-[13px] font-semibold leading-tight md:text-sm">
            {race.className}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-subtle">
            {race.distance !== null && (
              <span className="number-mono">{race.distance}m</span>
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-1.5 py-px text-[10px] font-semibold",
                TIER_BADGE[race.tier],
              )}
              title={tierLabel(race.tier)}
            >
              {race.tier === "none" ? "未分級" : `Tier ${race.tier}`}
            </span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-text-subtle">
            V19 前三名
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {race.topPicks.map((pick, idx) => (
              <span
                key={pick.no}
                className={cn(
                  "inline-flex items-baseline gap-1 text-[12px]",
                  pick.isHit && "font-semibold",
                )}
              >
                <span
                  className={cn(
                    "number-mono inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[11px]",
                    pick.isHit
                      ? "bg-precision/20 text-precision-glow"
                      : "bg-bg-subtle text-text-muted",
                  )}
                  aria-label={`第 ${idx + 1} 名預測 ${pick.no} 號${pick.isHit ? "（命中）" : ""}`}
                >
                  {pick.no}
                </span>
                {pick.name && (
                  <span
                    className={cn(
                      "truncate max-w-[8rem]",
                      pick.isHit ? "text-precision-glow" : "text-text-muted",
                    )}
                  >
                    {pick.name}
                  </span>
                )}
              </span>
            ))}
          </div>
          {race.qinBankerLabels.length > 0 && (
            <div className="mt-1 text-[10px] text-text-subtle">
              <span className="uppercase tracking-widest">
                {strategyLabel(mode)}
              </span>{" "}
              {race.qinBankerLabels.map((label, idx) => (
                <span key={label} className="number-mono text-text-muted">
                  {label}
                  {idx < race.qinBankerLabels.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-7 md:col-span-2 flex items-start gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-text-subtle">
              實際前三
            </div>
            <div className="mt-0.5 number-mono text-[12px] text-text">
              {race.actualTop3.length > 0 ? race.actualTop3.join(" · ") : "—"}
            </div>
          </div>
        </div>

        <div className="col-span-5 md:col-span-1 flex items-start justify-end">
          <StatusBadge judged={race.judged} hit={race.hit} size="md" />
        </div>
      </div>

      {pnl.hasBet && pnl.judged && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle/60 bg-bg-subtle/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="text-[9px] uppercase tracking-widest text-text-subtle">
              {strategyLabel(mode)} {pnl.bets} 注 · {pnl.wins} 勝
            </span>
            <PoolLine label="連贏" pnl={pnl.byPool.qin.pnl} />
            <span className="text-text-subtle">·</span>
            <PoolLine label="位置Q" pnl={pnl.byPool.qinQ.pnl} />
          </div>
          <span
            className={cn(
              "number-mono inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold",
              positive && "bg-precision/20 text-precision-glow",
              negative && "bg-danger/20 text-danger",
              !positive && !negative && "bg-bg-subtle text-text-muted",
            )}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : negative ? (
              <TrendingDown className="h-3 w-3" aria-hidden />
            ) : (
              <Wallet className="h-3 w-3" aria-hidden />
            )}
            {formatHk(pnl.pnl, true)}
          </span>
        </div>
      )}
    </article>
  );
}

function PoolLine({ label, pnl }: { label: string; pnl: number }) {
  const positive = pnl > 0;
  const negative = pnl < 0;
  return (
    <span className="number-mono inline-flex items-baseline gap-1.5">
      <span className="text-text-muted">{label}</span>
      <span
        className={cn(
          "font-semibold",
          positive && "text-precision-glow",
          negative && "text-danger",
          !positive && !negative && "text-text-muted",
        )}
      >
        {formatHk(pnl, true)}
      </span>
    </span>
  );
}
