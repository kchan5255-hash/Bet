"use client";

import { Activity, Target, Trophy, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HistoryPnlSummaryView, HistoryStatsView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";

interface KpiStripProps {
  stats: HistoryStatsView;
  pnl: HistoryPnlSummaryView;
  meetingCount: number;
}

export function KpiStrip({ stats, pnl, meetingCount }: KpiStripProps) {
  const hitPct = (stats.hitRate * 100).toFixed(1);
  const judgedPct = stats.totalRaces
    ? Math.round((stats.judgedRaces / stats.totalRaces) * 100)
    : 0;
  const winRate = pnl.judgedBets > 0 ? (pnl.wins / pnl.judgedBets) * 100 : 0;

  return (
    <section
      aria-label="關鍵指標"
      className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3"
    >
      <KpiTile
        icon={Target}
        label="預測命中率"
        value={`${hitPct}%`}
        sub={`${stats.hitRaces}/${stats.judgedRaces} 場`}
        accent="precision"
      />
      <KpiTile
        icon={Trophy}
        label="投注勝率"
        value={`${winRate.toFixed(1)}%`}
        sub={`${pnl.wins}/${pnl.judgedBets} 注`}
        accent="upset"
      />
      <KpiTile
        icon={Activity}
        label="已判定覆蓋"
        value={`${judgedPct}%`}
        sub={`${stats.judgedRaces}/${stats.totalRaces} 場`}
        accent="ai"
      />
      <KpiTile
        icon={Wallet}
        label="賽事場數"
        value={String(meetingCount)}
        sub="已追蹤"
        accent="muted"
      />
    </section>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent: "precision" | "upset" | "ai" | "muted";
}) {
  const accentMap = {
    precision: "text-precision-glow border-precision/25",
    upset: "text-upset-glow border-upset/25",
    ai: "text-text border-ai-start/25",
    muted: "text-text border-border-subtle",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border bg-bg-card p-3 transition-colors hover:border-border-glow md:p-4",
        accentMap[accent],
      )}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-muted">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      <div className="mt-2 number-mono text-2xl font-black md:text-3xl">{value}</div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-text-subtle number-mono">{sub}</div>
      )}
    </div>
  );
}
