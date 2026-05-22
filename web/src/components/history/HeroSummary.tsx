"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type {
  BetMode,
  EquityPointView,
  HistoryPnlSummaryView,
} from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { StrategySwitch } from "./StrategySwitch";
import { formatHk, formatHkCompact, formatRoi, strategyLabel } from "./format";
import { useReducedMotion } from "./hooks";

interface HeroSummaryProps {
  mode: BetMode;
  onModeChange: (mode: BetMode) => void;
  pnl: HistoryPnlSummaryView;
  equity: EquityPointView[];
  meetingCount: number;
  generatedAt: string;
}

export function HeroSummary({
  mode,
  onModeChange,
  pnl,
  equity,
  meetingCount,
  generatedAt,
}: HeroSummaryProps) {
  const reduceMotion = useReducedMotion();
  const positive = pnl.pnl > 0;
  const negative = pnl.pnl < 0;
  const Trend = positive ? TrendingUp : negative ? TrendingDown : Wallet;
  const last90 = equity.slice(-90);
  const minPnl = last90.reduce((m, p) => Math.min(m, p.cumPnl), 0);
  const sparkData = last90.length
    ? last90.map((p) => ({ ...p, cumPnl: p.cumPnl - minPnl }))
    : [];
  const startDate = equity[0]?.date ?? "";

  return (
    <section
      className="relative overflow-hidden bento-card"
      aria-labelledby="history-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 80% 0%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(circle at 0% 100%, rgba(99,102,241,0.12), transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-text-subtle">
            <span className="h-px w-6 bg-border" />
            歷史戰績
          </div>
          <span className="rounded-full border border-upset/30 bg-upset/10 px-2 py-0.5 text-[10px] tracking-wider text-upset-glow">
            V19 模型
          </span>
          <div className="ml-auto">
            <StrategySwitch value={mode} onChange={onModeChange} />
          </div>
        </div>

        <h1 id="history-hero-title" className="sr-only">
          歷史戰績 · {strategyLabel(mode)} · 累積 {formatHk(pnl.pnl, true)}
        </h1>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-text-muted">
              {strategyLabel(mode)} · 累積盈虧
            </div>
            <div
              className={cn(
                "mt-1 number-mono text-5xl font-black leading-none md:text-6xl",
                positive && "text-precision-glow",
                negative && "text-danger",
                !positive && !negative && "text-text",
              )}
            >
              {formatHk(pnl.pnl, true)}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                  positive && "bg-precision/15 text-precision-glow",
                  negative && "bg-danger/15 text-danger",
                  !positive && !negative && "bg-bg-subtle text-text-muted",
                )}
              >
                <Trend className="h-3.5 w-3.5" aria-hidden />
                <span className="number-mono">{formatRoi(pnl.roi)}</span>
                <span className="ml-0.5 text-[10px] font-normal opacity-80">ROI</span>
              </span>
              <span className="text-[11px] text-text-muted">
                {pnl.judgedBets} 注 · {pnl.wins} 勝
              </span>
            </div>

            <p className="mt-3 text-[11px] text-text-subtle">
              {meetingCount} 場賽事 · 起算 {startDate || "—"} · 更新 {formatGenerated(generatedAt)}
            </p>
          </div>

          <div className="relative min-h-[120px] md:min-h-[140px]">
            <div className="absolute inset-x-0 top-0 flex items-center justify-between text-[10px] uppercase tracking-widest text-text-subtle">
              <span>近 {sparkData.length} 場走勢</span>
              <span className="number-mono text-text-muted">
                {formatHkCompact(pnl.pnl, true)}
              </span>
            </div>
            <div
              className="absolute inset-x-[-6px] bottom-0 top-5 md:top-6"
              role="img"
              aria-label={`累積盈虧由 ${formatHk(0)} 變化至 ${formatHk(pnl.pnl, true)} 的近期走勢`}
            >
              {sparkData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D399" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="hero-spark-stroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="cumPnl"
                      stroke="url(#hero-spark-stroke)"
                      strokeWidth={2}
                      fill="url(#hero-spark-fill)"
                      isAnimationActive={!reduceMotion}
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-text-subtle">
                  尚無走勢資料
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatGenerated(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}
