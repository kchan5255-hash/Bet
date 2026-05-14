import {
  getResults,
  getMeetingDates,
  getLatestMeetingDate,
  weekdayLabel,
} from "@/lib/results";
import { ResultsPageClient } from "@/components/ResultsPageClient";

interface ResultsPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const { date } = await searchParams;
  const meetingDates = getMeetingDates();
  const validDates = new Set(meetingDates.map((d) => d.date));
  const targetDate =
    date && validDates.has(date) ? date : getLatestMeetingDate();
  const data = getResults(targetDate);

  return (
    <ResultsPageClient
      data={data}
      meetingDates={meetingDates}
      weekday={weekdayLabel(targetDate)}
    />
  );
}
