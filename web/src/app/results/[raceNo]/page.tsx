import { notFound } from "next/navigation";
import {
  getResults,
  getResultRace,
  getDividends,
  getModelRanking,
  getRunnerScores,
  groupDividends,
  getMeetingDates,
  getLatestMeetingDate,
  formatPostTimeShort,
} from "@/lib/results";
import { isV19Available } from "@/lib/v19-model";
import { ResultDetailClient } from "@/components/ResultDetailClient";

interface ResultDetailPageProps {
  params: Promise<{ raceNo: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function ResultDetailPage({
  params,
  searchParams,
}: ResultDetailPageProps) {
  const [{ raceNo: raceNoStr }, { date }] = await Promise.all([
    params,
    searchParams,
  ]);
  const raceNo = Number(raceNoStr);
  if (!Number.isFinite(raceNo)) notFound();

  const meetingDates = getMeetingDates();
  const validDates = new Set(meetingDates.map((d) => d.date));
  const targetDate =
    date && validDates.has(date) ? date : getLatestMeetingDate();

  const data = getResults(targetDate);
  const race = getResultRace(targetDate, raceNo);
  if (!race) notFound();

  const proRanking = getModelRanking(targetDate, raceNo, "pro");
  const proScores = getRunnerScores(targetDate, raceNo, "pro");
  const v9Ranking = getModelRanking(targetDate, raceNo, "v9");
  const v9Scores = getRunnerScores(targetDate, raceNo, "v9");
  const v19Available = isV19Available(targetDate);
  const v19Ranking = v19Available
    ? getModelRanking(targetDate, raceNo, "v19")
    : new Map<string, number>();
  const v19Scores = v19Available
    ? getRunnerScores(targetDate, raceNo, "v19")
    : new Map<string, number>();
  const dividends = groupDividends(getDividends(targetDate, raceNo));

  const top4 = race.top4.map((r) => ({
    plc: r.plc,
    no: r.no,
    name: r.name,
    code: r.code,
    jockey: r.jockey,
    trainer: r.trainer,
    draw: r.draw,
    proRank: proRanking.get(r.no) ?? null,
    proScore: proScores.get(r.no) ?? null,
    v9Rank: v9Ranking.get(r.no) ?? null,
    v9Score: v9Scores.get(r.no) ?? null,
    v19Rank: v19Ranking.get(r.no) ?? null,
    v19Score: v19Scores.get(r.no) ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-3 md:px-6 py-3 md:py-6">
      <ResultDetailClient
        date={data.date}
        venue={data.venue}
        venueName={data.venueName}
        races={data.races.map((r) => ({
          raceNo: r.raceNo,
          postTime: r.postTime,
          className: r.className,
          distance: r.distance,
          going: r.going,
          course: r.course,
          raceName: r.raceName || r.titleBlock,
        }))}
        currentRaceNo={raceNo}
        race={{
          raceNo: race.raceNo,
          raceName: race.raceName || race.titleBlock,
          className: race.className,
          distance: race.distance,
          course: race.course,
          going: race.going,
          time: formatPostTimeShort(race.postTime),
        }}
        top4={top4}
        dividends={dividends}
        v19Available={v19Available}
      />
    </div>
  );
}
