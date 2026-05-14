import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getResults,
  getResultRace,
  getDividends,
  getModelRanking,
  getRunnerScores,
  groupDividends,
  formatPostTimeShort,
} from "@/lib/results";
import { ResultDetailClient } from "@/components/ResultDetailClient";

export function generateStaticParams() {
  return getResults().races.map((r) => ({ raceNo: String(r.raceNo) }));
}

interface ResultDetailPageProps {
  params: Promise<{ raceNo: string }>;
}

export default async function ResultDetailPage({
  params,
}: ResultDetailPageProps) {
  const { raceNo: raceNoStr } = await params;
  const raceNo = Number(raceNoStr);
  if (!Number.isFinite(raceNo)) notFound();

  const data = getResults();
  const race = getResultRace(raceNo);
  if (!race) notFound();

  const modelRanking = getModelRanking(raceNo);
  const scores = getRunnerScores(raceNo);
  const dividends = groupDividends(getDividends(raceNo));

  const top4 = race.top4.map((r) => ({
    plc: r.plc,
    no: r.no,
    name: r.name,
    code: r.code,
    jockey: r.jockey,
    trainer: r.trainer,
    draw: r.draw,
    modelRank: modelRanking.get(r.no) ?? null,
    score: scores.get(r.no) ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-3 md:px-6 py-3 md:py-6">
      <header className="hidden md:flex items-center gap-3 mb-5">
        <Link
          href="/results"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-muted hover:text-text transition"
          aria-label="返回賽果列表"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          賽果派彩
        </h1>
      </header>

      <ResultDetailClient
        date={data.date}
        venue={data.venue}
        venueName={data.venueName}
        races={data.races.map((r) => ({
          raceNo: r.raceNo,
          postTime: r.postTime,
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
      />
    </div>
  );
}
