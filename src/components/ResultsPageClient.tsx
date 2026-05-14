"use client";

import { useRouter } from "next/navigation";
import { Trophy, MapPin } from "lucide-react";
import type { DateMeta, ResultsPayload } from "@/lib/results";
import { ResultsList } from "./ResultsList";
import { DatePicker } from "./DatePicker";

interface ResultsPageClientProps {
  data: ResultsPayload;
  meetingDates: DateMeta[];
  weekday: string;
}

export function ResultsPageClient({
  data,
  meetingDates,
  weekday,
}: ResultsPageClientProps) {
  const router = useRouter();

  const onChangeDate = (date: string) => {
    router.push(`/results?date=${date}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-3 md:px-6 py-3 md:py-6">
      <header className="mb-3 md:mb-5 space-y-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest">
          <span className="h-px w-8 bg-border" />
          Race Results &amp; Dividends
        </div>

        <div className="hidden md:flex items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            賽果派彩
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs">
            <Trophy className="h-3.5 w-3.5 text-text-muted" />
            <MapPin className="h-3.5 w-3.5 text-text-muted" />
            <span className="font-semibold">
              {weekday}「{data.venueName}」
            </span>
          </div>
        </div>

        <DatePicker
          selectedDate={data.date}
          meetingDates={meetingDates}
          onChange={onChangeDate}
        />
      </header>

      <ResultsList data={data} />
    </div>
  );
}
