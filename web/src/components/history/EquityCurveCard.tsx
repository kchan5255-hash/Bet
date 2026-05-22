"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart } from "lucide-react";
import type { BetMode, EquityPointView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { RangeToggle, type EquityRange } from "./RangeToggle";
import { formatHk, formatHkCompact, strategyLabel } from "./format";
import { useIsMobile, useReducedMotion } from "./hooks";

interface EquityCurveCardProps {
  mode: BetMode;
  equity: EquityPointView[];
}

const RANGE_DAYS: Record<EquityRange, number | null> = {
  all: null,
  "30d": 30,
  "7d": 7,
};

export function EquityCurveCard({ mode, equity }: EquityCurveCardProps) {
  const [range, setRange] = useState<EquityRange>("all");
  const [showHitRate, setShowHitRate] = useState(false);
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const data = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === null) return equity;
    return equity.slice(-days);
  }, [equity, range]);

  const finalPnl = data.length ? data[data.length - 1].cumPnl : 0;
  const peakPnl = data.reduce((m, p) => Math.max(m, p.cumPnl), 0);
  const troughPnl = data.reduce((m, p) => Math.min(m, p.cumPnl), 0);
  const drawdown = troughPnl < peakPnl ? troughPnl - peakPnl : 0;

  const hasData = data.length >= 2;

  return (
    <section className="bento-card p-5 md:p-6" aria-labelledby="equity-curve-title">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="equity-curve-title"
            className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-text-muted"
          >
            <LineChart className="h-3.5 w-3.5 text-precision-glow" aria-hidden />
            累積盈虧曲線
          </h3>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            {strategyLabel(mode)} · 每場結算後計入累積 P&amp;L
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </header>

      <div
        className="h-64 md:h-72"
        role="img"
        aria-labelledby="equity-curve-summary"
      >
        <span id="equity-curve-summary" className="sr-only">
          {`累積盈虧由 ${formatHk(0)} 變化至 ${formatHk(finalPnl, true)}，期間最高 ${formatHk(peakPnl, true)}，最低 ${formatHk(troughPnl, true)}，最大回撤 ${formatHk(drawdown)}。`}
        </span>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={224}>
            <ComposedChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="equity-fill-pos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="equity-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2937" strokeDasharray="2 4" />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#1F2937" }}
                tickFormatter={(value: string) => value.slice(5)}
                minTickGap={24}
              />
              <YAxis
                yAxisId="pnl"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatHkCompact(value)}
                width={48}
              />
              {showHitRate && (
                <YAxis
                  yAxisId="hit"
                  orientation="right"
                  stroke="#A78BFA"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  width={36}
                />
              )}
              <Tooltip
                cursor={{ stroke: "#475569", strokeDasharray: "2 4" }}
                contentStyle={{
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  fontSize: 12,
                  backdropFilter: "blur(8px)",
                }}
                labelStyle={{ color: "#94A3B8", marginBottom: 4 }}
                formatter={(value, name) => {
                  if (name === "cumPnl")
                    return [formatHk(Number(value), true), "累積盈虧"];
                  if (name === "hitRate")
                    return [`${Number(value).toFixed(1)}%`, "命中率"];
                  return [String(value), String(name)];
                }}
              />
              <ReferenceLine
                yAxisId="pnl"
                y={0}
                stroke="#475569"
                strokeDasharray="2 4"
              />
              <Area
                yAxisId="pnl"
                type="monotone"
                dataKey="cumPnl"
                stroke="url(#equity-stroke)"
                strokeWidth={2.5}
                fill="url(#equity-fill-pos)"
                isAnimationActive={!reduceMotion}
                animationDuration={600}
                dot={false}
                activeDot={{ r: 5, fill: "#34D399", stroke: "#0F172A", strokeWidth: 2 }}
              />
              {showHitRate && (
                <Line
                  yAxisId="hit"
                  type="monotone"
                  dataKey="hitRate"
                  stroke="#A78BFA"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={!reduceMotion}
                />
              )}
              {range === "all" && !isMobile && data.length > 8 && (
                <Brush
                  dataKey="date"
                  height={20}
                  stroke="#6366F1"
                  fill="#0B1220"
                  travellerWidth={8}
                  tickFormatter={(value: string) => value.slice(5)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-text-subtle">
            區段資料不足
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={showHitRate}
          aria-pressed={showHitRate}
          onClick={() => setShowHitRate((v) => !v)}
          className={cn(
            "min-h-[32px] inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-start/70",
            showHitRate
              ? "border-upset/40 bg-upset/15 text-upset-glow"
              : "border-border-subtle bg-bg-subtle text-text-muted hover:text-text",
          )}
        >
          <span
            className={cn(
              "inline-block h-1.5 w-3 rounded-full",
              showHitRate ? "bg-upset-glow" : "bg-border",
            )}
            aria-hidden
          />
          顯示命中率
        </button>
        {range === "all" && !isMobile && data.length > 8 && (
          <span className="text-[10px] text-text-subtle">
            提示：拖動底部 brush 可放大區段
          </span>
        )}
      </div>
    </section>
  );
}
