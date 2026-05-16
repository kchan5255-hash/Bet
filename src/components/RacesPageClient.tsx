"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import type { Race } from "@/lib/types";
import type { MeetingMeta } from "@/lib/data";
import type { DateMeta } from "@/lib/results";
import { formatMeetingDate } from "@/lib/data";
import { DatePicker } from "./DatePicker";
import { RaceViewer } from "./RaceViewer";

interface RacesPageClientProps {
  races: Race[];
  date: string;
  meetings: MeetingMeta[];
}

export function RacesPageClient({
  races,
  date,
  meetings,
}: RacesPageClientProps) {
  const router = useRouter();
  const meta = meetings.find((m) => m.date === date);
  const datePickerMeetings: DateMeta[] = meetings.map((m) => ({
    date: m.date,
    venue: m.venue,
    venueName: m.venueName,
    raceCount: m.raceCount,
  }));

  const onChangeDate = (next: string) => {
    router.push(`/races?date=${next}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-3 md:px-6 py-3 md:py-6">
      <header className="mb-3 md:mb-5 space-y-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest">
          <span className="h-px w-8 bg-border" />
          Current Meeting
        </div>

        <div className="hidden md:flex items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            勝率預測
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-text-muted">賽馬日</span>
            <span className="font-semibold">{formatMeetingDate(date)}</span>
            {meta?.venueName && (
              <>
                <span className="text-text-subtle">·</span>
                <span className="text-text-muted">{meta.venueName}</span>
              </>
            )}
          </div>
        </div>

        <DatePicker
          selectedDate={date}
          meetingDates={datePickerMeetings}
          onChange={onChangeDate}
        />
      </header>

      <RaceViewer races={races} date={date} />
    </div>
  );
}
