import { Calendar } from "lucide-react";
import { formatMeetingDate } from "@/lib/meeting-utils";
import type { RaceTierSummary } from "@/lib/race-view-types";

interface RaceHeroProps {
  date: string;
  venueName?: string;
  tierSummary: RaceTierSummary;
  v19Available: boolean;
}

export function RaceHero({
  date,
  venueName,
  tierSummary,
  v19Available,
}: RaceHeroProps) {
  const recommendCount = tierSummary.S + tierSummary.A + tierSummary.B;

  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-subtle">
        <span className="h-px w-6 bg-border" />
        本期賽事
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight md:text-4xl">
          勝率<span className="ai-text-gradient">預測</span>
        </h1>
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-1.5 text-[11px] md:text-xs">
          <Calendar className="h-3.5 w-3.5 text-text-muted" aria-hidden />
          <span className="text-text-muted">賽馬日</span>
          <span className="font-semibold">{formatMeetingDate(date)}</span>
          {venueName && (
            <>
              <span className="text-text-subtle">·</span>
              <span className="text-text-muted">{venueName}</span>
            </>
          )}
          {!v19Available && (
            <span className="ml-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
              V19 未到位
            </span>
          )}
        </div>
      </div>

      <span className="sr-only">
        本期共 {tierSummary.total} 場，V19 推介 {recommendCount} 場（
        高信心 Tier S {tierSummary.S} 場、中信心 Tier A {tierSummary.A} 場、
        低信心 Tier B {tierSummary.B} 場、跳過 {tierSummary.skip} 場）。
      </span>
    </header>
  );
}
