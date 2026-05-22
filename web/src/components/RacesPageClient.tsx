"use client";

import { useRouter } from "next/navigation";
import type { MeetingMeta } from "@/lib/meeting-utils";
import type { RaceViewerPayload } from "@/lib/race-view-types";
import { AdSlot } from "./ads/AdSlot";
import { DatePicker } from "./DatePicker";
import { RaceHero } from "./races/RaceHero";
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
    <div className="mx-auto max-w-5xl px-3 md:px-6 py-3 md:py-6 space-y-3 md:space-y-5">
      <RaceHero
        date={date}
        venueName={meta?.venueName}
        tierSummary={payload.tierSummary}
        v19Available={payload.v19Available}
      />

      <DatePicker
        selectedDate={date}
        meetingDates={meetings}
        onChange={onChangeDate}
      />

      <AdSlot slot="races-list-banner" layout="leaderboard" />

      <RaceViewer payload={payload} />
    </div>
  );
}
