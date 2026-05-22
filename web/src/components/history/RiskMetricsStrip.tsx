"use client";

import { Activity, Flame, ShieldAlert, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BetMode, RiskMetricsView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { formatHkCompact, strategyLabel } from "./format";

interface RiskMetricsStripProps {
  mode: BetMode;
  risk: RiskMetricsView;
}

export function RiskMetricsStrip({ mode, risk }: RiskMetricsStripProps) {
  const dd = risk.maxDrawdown;
  const pf = risk.profitFactor;
  const cur = risk.streaks;

  const pfDisplay =
    pf >= 999 ? "∞" : pf > 0 ? pf.toFixed(2) : "—";
  const pfTone: "good" | "warn" | "bad" =
    pf >= 1.5 ? "good" : pf >= 1 ? "warn" : "bad";

  const currentLabel =
    cur.currentType === "win"
      ? `連勝中 ${cur.currentLen}`
      : cur.currentType === "loss"
        ? `連敗中 ${cur.currentLen}`
        : "尚無紀錄";

  return (
    <section
      aria-label={`${strategyLabel(mode)}風險指標`}
      className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3"
    >
      <RiskTile
        icon={Flame}
        label="最長連勝"
        value={`${cur.longestWin}`}
        sub="場"
        tone="good"
        hint={cur.currentType === "win" ? currentLabel : undefined}
      />
      <RiskTile
        icon={Activity}
        label="最長連敗"
        value={`${cur.longestLoss}`}
        sub="場"
        tone="bad"
        hint={cur.currentType === "loss" ? currentLabel : undefined}
      />
      <RiskTile
        icon={TrendingDown}
        label="最大回撤"
        value={formatHkCompact(dd, dd < 0)}
        sub={
          risk.maxDrawdownPct < 0
            ? `${risk.maxDrawdownPct.toFixed(1)}%`
            : "—"
        }
        tone={dd < 0 ? "bad" : "muted"}
      />
      <RiskTile
        icon={ShieldAlert}
        label="盈利因子"
        value={pfDisplay}
        sub={pf > 0 ? "Σ贏 ÷ Σ輸" : "尚無投注"}
        tone={pfTone}
      />
    </section>
  );
}

function RiskTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "warn" | "bad" | "muted";
  hint?: string;
}) {
  const toneMap = {
    good: "text-precision-glow border-precision/25",
    warn: "text-warning border-warning/30",
    bad: "text-danger border-danger/25",
    muted: "text-text border-border-subtle",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border bg-bg-card p-3 transition-colors hover:border-border-glow md:p-4",
        toneMap[tone],
      )}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-muted">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="number-mono text-2xl font-black md:text-3xl">{value}</span>
        {sub && (
          <span className="text-[10px] text-text-subtle number-mono">{sub}</span>
        )}
      </div>
      {hint && (
        <div className="mt-1 text-[10px] text-text-muted">{hint}</div>
      )}
    </div>
  );
}
