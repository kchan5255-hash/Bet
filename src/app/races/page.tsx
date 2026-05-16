import { getRaces, getMeetings, getLatestMeetingDate } from "@/lib/data";
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
  const races = getRaces(targetDate);

  return (
    <RacesPageClient races={races} date={targetDate} meetings={meetings} />
  );
}
