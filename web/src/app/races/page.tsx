import { getMeetings, getLatestMeetingDate } from "@/lib/data";
import { getRaceViewerPayload } from "@/lib/race-view";
import { RacesPageClient } from "@/components/RacesPageClient";

interface RacesPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function RacesPage({ searchParams }: RacesPageProps) {
  const { date } = await searchParams;
  const meetings = getMeetings();
  const validDates = new Set(meetings.map((m) => m.date));
  const targetDate =
    date && validDates.has(date) ? date : getLatestMeetingDate();

  const payload = getRaceViewerPayload(targetDate, { authenticated: true });

  return (
    <RacesPageClient payload={payload} date={targetDate} meetings={meetings} />
  );
}
