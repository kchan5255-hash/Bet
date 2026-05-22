"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import type { MeetingMeta } from "@/lib/meeting-utils";
import { formatMeetingDate } from "@/lib/meeting-utils";
import type { RaceViewerPayload } from "@/lib/race-view-types";
import { AdSlot } from "./ads/AdSlot";
import { DatePicker } from "./DatePicker";
import { RaceViewer } from "./RaceViewer";

interface RacesPageClientProps {
  payload: RaceViewerPayload;
  date: string;
  meetings: MeetingMeta[];
}

export function RacesPageClient({
  payload,
  date,
  meetings,
}: RacesPageClientProps) {
  const router = useRouter();
  const meta = meetings.find((m) => m.date === date);

  const onChangeDate = (next: string) => {
    router.push(`/races?date=${next}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-3 md:px-6 py-3 md:py-6">
      <header className="mb-3 md:mb-5 space-y-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest">
          <span className="h-px w-8 bg-border" />
          本期賽事
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
          meetingDates={meetings}
          onChange={onChangeDate}
        />
      </header>

      <AdSlot slot="races-list-banner" layout="leaderboard" className="mb-3" />

      <RaceViewer payload={payload} />
    </div>
  );
}
