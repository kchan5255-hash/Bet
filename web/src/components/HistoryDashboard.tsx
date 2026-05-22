"use client";

import { Suspense, useState } from "react";
import type {
  BetMode,
  HistoryDashboardData,
} from "@/lib/history-view-types";
import { EmptyState } from "./history/EmptyState";
import { EquityCurveCard } from "./history/EquityCurveCard";
import { FilterBar } from "./history/FilterBar";
import { HeroSummary } from "./history/HeroSummary";
import { KpiStrip } from "./history/KpiStrip";
import { MeetingBlock } from "./history/MeetingBlock";
import { PerformanceBreakdown } from "./history/PerformanceBreakdown";
import { useHistoryFilter } from "./history/useHistoryFilter";

interface HistoryDashboardProps {
  data: HistoryDashboardData;
}

export function HistoryDashboard({ data }: HistoryDashboardProps) {
  return (
    <Suspense fallback={null}>
      <HistoryDashboardInner data={data} />
    </Suspense>
  );
}

function HistoryDashboardInner({ data }: HistoryDashboardProps) {
  const [mode, setMode] = useState<BetMode>("banker");

  const pnl = mode === "banker" ? data.bankerPnl : data.crossPnl;
  const equity = mode === "banker" ? data.equity.banker : data.equity.cross;
  const breakdown =
    mode === "banker" ? data.breakdown.banker : data.breakdown.cross;

  const { filter, setFilter, reset, filtered, isFiltered, monthOptions } =
    useHistoryFilter(data.meetings);

  const noData = data.meetings.length === 0;
  const noJudged = !noData && data.stats.judgedRaces === 0;

  return (
    <div className="space-y-5 md:space-y-7">
      <HeroSummary
        mode={mode}
        onModeChange={setMode}
        pnl={pnl}
        equity={equity}
        meetingCount={data.meetingCount}
        generatedAt={data.generatedAt}
      />

      <KpiStrip stats={data.stats} pnl={pnl} meetingCount={data.meetingCount} />

      <EquityCurveCard mode={mode} equity={equity} />

      <PerformanceBreakdown mode={mode} breakdown={breakdown} />

      {noData ? (
        <EmptyState variant="no-data" />
      ) : (
        <>
          <FilterBar
            filter={filter}
            onChange={setFilter}
            onReset={reset}
            isFiltered={isFiltered}
            monthOptions={monthOptions}
            totalMeetings={data.meetingCount}
            shownMeetings={filtered.length}
          />

          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">
                  賽事回顧
                </h3>
                <p className="mt-0.5 text-[11px] text-text-subtle">
                  V19 前三名預測、已判定賽果及
                  {mode === "banker" ? "膽拖" : "全串"}投注績效。
                </p>
              </div>
              <span className="text-[11px] text-text-subtle">
                {filtered.length} / {data.meetingCount} 場
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                variant={isFiltered ? "no-filter-result" : "no-judged"}
                onAction={isFiltered ? reset : undefined}
                actionLabel={isFiltered ? "清除全部篩選" : undefined}
              />
            ) : noJudged ? (
              <EmptyState variant="no-judged" />
            ) : (
              <div className="space-y-4">
                {filtered.map((meeting) => (
                  <MeetingBlock
                    key={meeting.date}
                    meeting={meeting}
                    mode={mode}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <footer className="text-center text-[10px] text-text-subtle">
        資料更新 {data.generatedAt.slice(0, 16).replace("T", " ")} (HKT)
      </footer>
    </div>
  );
}
