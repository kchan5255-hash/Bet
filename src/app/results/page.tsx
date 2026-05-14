import { Trophy, MapPin } from "lucide-react";
import {
  getResults,
  weekdayLabel,
} from "@/lib/results";
import { ResultsList } from "@/components/ResultsList";

export default function ResultsPage() {
  const data = getResults();

  return (
    <div className="mx-auto max-w-5xl px-3 md:px-6 py-3 md:py-6">
      <header className="mb-3 md:mb-5">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          Race Results &amp; Dividends
        </div>

        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            賽果派彩
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs">
            <Trophy className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-text-muted">賽馬日</span>
            <span className="font-semibold">{data.date}</span>
            <span className="text-text-subtle">·</span>
            <MapPin className="h-3.5 w-3.5 text-text-muted" />
            <span className="font-semibold">{data.venueName}</span>
          </div>
        </div>

        <div className="md:hidden flex items-center justify-center gap-3 text-xs">
          <div className="text-center">
            <div className="font-bold">{data.date}</div>
            <div className="text-[10px] text-text-muted">
              {weekdayLabel(data.date)}「{data.venueName}」
            </div>
          </div>
        </div>
      </header>

      <ResultsList data={data} />
    </div>
  );
}
