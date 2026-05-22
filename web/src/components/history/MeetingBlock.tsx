"use client";

import type { BetMode, HistoryMeetingView } from "@/lib/history-view-types";
import { formatMeetingDate, weekdayLabel } from "@/lib/meeting-utils";
import { cn } from "@/lib/utils";
import { formatHk, strategyLabel, venueLabel } from "./format";
import { RaceRowGrid } from "./RaceRowGrid";

interface MeetingBlockProps {
  meeting: HistoryMeetingView;
  mode: BetMode;
}

export function MeetingBlock({ meeting, mode }: MeetingBlockProps) {
  const summary = mode === "banker" ? meeting.bankerPnl : meeting.crossPnl;
  const positive = summary.pnl > 0;
  const negative = summary.pnl < 0;

  return (
    <div className="overflow-hidden bento-card bento-card-hover">
      <header className="grid grid-cols-12 items-center gap-3 border-b border-border-subtle px-4 py-3 md:px-5">
        <div className="col-span-12 md:col-span-5 min-w-0 border-l-2 border-precision/40 pl-3">
          <h3 className="truncate text-sm font-bold md:text-base">
            {formatMeetingDate(meeting.date)}
            <span className="ml-1.5 text-[11px] font-normal text-text-subtle">
              {weekdayLabel(meeting.date)}
            </span>
          </h3>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            {venueLabel(meeting.venue)} · {meeting.raceCount} 場 · 已判定{" "}
            <span className="number-mono">{meeting.judged}</span> · 命中{" "}
            <span className="number-mono">{meeting.hit}</span>
          </p>
        </div>

        <div className="col-span-7 md:col-span-4">
          <div className="text-[10px] uppercase tracking-widest text-text-subtle">
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
          <div className="text-[10px] text-text-subtle">
            {summary.judgedBets > 0 ? (
              <span className="number-mono">
                {summary.wins}/{summary.judgedBets} 注 · ROI {(summary.roi * 100).toFixed(1)}%
              </span>
            ) : (
              "未投注"
            )}
          </div>
        </div>

        <div className="col-span-5 md:col-span-3 text-right">
          <div className="text-[10px] uppercase tracking-widest text-text-subtle">
            命中率
          </div>
          <div className="number-mono text-xl font-black ai-text-gradient">
            {meeting.rate.toFixed(0)}%
          </div>
        </div>
      </header>

      <div className="divide-y divide-border-subtle/70">
        {meeting.races.map((race) => (
          <RaceRowGrid
            key={`${meeting.date}-${race.raceNo}`}
            race={race}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}
