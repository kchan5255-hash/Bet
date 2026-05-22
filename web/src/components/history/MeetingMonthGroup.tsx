"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useMemo } from "react";
import type { BetMode, HistoryMeetingView } from "@/lib/history-view-types";
import { cn } from "@/lib/utils";
import { AdSlot } from "../ads/AdSlot";
import { formatHk, formatMonthLabel, strategyLabel } from "./format";
import { MeetingBlock } from "./MeetingBlock";

interface MeetingMonthGroupProps {
  month: string;
  meetings: HistoryMeetingView[];
  mode: BetMode;
  isOpen: boolean;
  onToggle: () => void;
  showInFeedAd?: boolean;
}

export function MeetingMonthGroup({
  month,
  meetings,
  mode,
  isOpen,
  onToggle,
  showInFeedAd = false,
}: MeetingMonthGroupProps) {
  const summary = useMemo(() => {
    let judged = 0;
    let hit = 0;
    let pnl = 0;
    for (const m of meetings) {
      judged += m.judged;
      hit += m.hit;
      const p = mode === "banker" ? m.bankerPnl : m.crossPnl;
      pnl += p.pnl;
    }
    const rate = judged > 0 ? (hit / judged) * 100 : 0;
    return { judged, hit, rate, pnl };
  }, [meetings, mode]);

  const positive = summary.pnl > 0;
  const negative = summary.pnl < 0;
  const panelId = `month-panel-${month}`;

  return (
    <section className="space-y-3" aria-labelledby={`month-header-${month}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        id={`month-header-${month}`}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-bg-card px-4 py-3 text-left transition-colors hover:border-border-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-ai-start md:px-5",
        )}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-subtle transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold md:text-base">
              {formatMonthLabel(month)}
            </span>
            <span className="text-[11px] text-text-subtle">
              {meetings.length} 個賽馬日
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-text-subtle">
            命中{" "}
            <span className="number-mono">
              {summary.hit}/{summary.judged}
            </span>
            {summary.judged > 0 && (
              <>
                {" · "}
                <span className="number-mono">{summary.rate.toFixed(0)}%</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest text-text-subtle">
            {strategyLabel(mode)} 盈虧
          </div>
          <div
            className={cn(
              "number-mono text-base font-bold md:text-lg",
              positive && "text-precision-glow",
              negative && "text-danger",
              !positive && !negative && "text-text-muted",
            )}
          >
            {formatHk(summary.pnl, true)}
          </div>
        </div>
      </button>

      {isOpen && (
        <div id={panelId} className="space-y-4">
          {meetings.map((meeting, idx) => (
            <Fragment key={meeting.date}>
              <MeetingBlock meeting={meeting} mode={mode} />
              {showInFeedAd && idx === 2 && meetings.length >= 5 && (
                <AdSlot slot="history-feed-mid" layout="in-feed" closable />
              )}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
