"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  ChevronRight,
  Play,
  TrendingUp,
} from "lucide-react";
import {
  formatPostTimeShort,
  videoLabel,
  type ResultRace,
  type ResultsPayload,
  type VideoKind,
} from "@/lib/results-shared";
import { AdSlot } from "./ads/AdSlot";
import {
  VideoPlayerDialog,
  type VideoTarget,
} from "./VideoPlayerDialog";

interface ResultsListProps {
  data: ResultsPayload;
}

export function ResultsList({ data }: ResultsListProps) {
  const [videoTarget, setVideoTarget] = useState<VideoTarget | null>(null);

  const openVideo = (race: ResultRace, kind: VideoKind) =>
    setVideoTarget({
      raceNo: race.raceNo,
      raceTitle: `第 ${race.raceNo} 場 · ${race.raceName || race.titleBlock}`,
      date: data.date,
      venue: data.venue,
      initialKind: kind,
    });

  if (data.races.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-8">
        該賽馬日暫無資料。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.races.map((race, idx) => {
        const position = idx + 1;
        // 每 4 場後插一個廣告，但最後一場後不插
        const showAd =
          position % 4 === 0 && position < data.races.length;
        return (
          <Fragment key={race.raceNo}>
            <RaceCard
              race={race}
              date={data.date}
              onVideo={(kind) => openVideo(race, kind)}
            />
            {showAd && (
              <AdSlot
                slot="results-list-banner"
                layout="leaderboard"
                closable
              />
            )}
          </Fragment>
        );
      })}

      <VideoPlayerDialog
        target={videoTarget}
        onClose={() => setVideoTarget(null)}
      />
    </div>
  );
}

function RaceCard({
  race,
  date,
  onVideo,
}: {
  race: ResultRace;
  date: string;
  onVideo: (kind: VideoKind) => void;
}) {
  const time = formatPostTimeShort(race.postTime);
  const top4Nos = race.top4.map((r) => r.no);
  const detailHref = `/results/${race.raceNo}?date=${date}`;

  return (
    <article className="rounded-xl border-l-4 border-l-precision border border-border-subtle bg-bg-elevated overflow-hidden">
      <Link
        href={detailHref}
        className="flex items-stretch hover:bg-bg-subtle/40 transition"
        aria-label={`查看第 ${race.raceNo} 場詳情`}
      >
        <RaceBadge raceNo={race.raceNo} />

        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-0.5">
                <span className="font-semibold text-text">{race.className}</span>
                <span>·</span>
                <span className="number-mono">{race.distance}米</span>
                {time && (
                  <>
                    <span>·</span>
                    <span className="number-mono">{time}</span>
                  </>
                )}
              </div>
              <div className="text-sm font-bold text-text truncate">
                {race.raceName || race.titleBlock}
              </div>
              <div className="text-[10px] text-text-subtle truncate">
                {race.course} · {race.going}
              </div>

              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <Trophy className="h-3.5 w-3.5 text-precision" />
                <span className="text-[10px] text-text-muted">賽果</span>
                {top4Nos.map((no, idx) => (
                  <PlaceChip key={no} place={idx + 1} no={no} />
                ))}
              </div>
            </div>

            <div className="flex items-center shrink-0 self-center">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-subtle text-text-muted">
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-px bg-border-subtle">
        <VideoTile
          kind="replay"
          icon={<Play className="h-3.5 w-3.5" />}
          onClick={() => onVideo("replay")}
        />
        <VideoTile
          kind="passthrough"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          onClick={() => onVideo("passthrough")}
        />
      </div>
    </article>
  );
}

function RaceBadge({ raceNo }: { raceNo: number }) {
  return (
    <div className="flex flex-col items-center justify-center w-12 shrink-0 bg-bg-subtle border-r border-border-subtle">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-precision/40 bg-precision/10 text-precision number-mono text-sm font-bold">
        {raceNo}
      </div>
      <div className="mt-1 rounded bg-precision/15 px-1 py-px text-[9px] font-semibold text-precision-glow">
        幸運簽
      </div>
    </div>
  );
}

function PlaceChip({ place, no }: { place: number; no: string }) {
  const tone =
    place === 1
      ? "border-warning/50 bg-warning/15 text-warning"
      : place === 2
        ? "border-text-muted/40 bg-text-muted/10 text-text"
        : place === 3
          ? "border-upset/40 bg-upset/10 text-upset-glow"
          : "border-border bg-bg-subtle text-text-muted";

  return (
    <span
      className={`number-mono inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[11px] font-bold ${tone}`}
      title={`第 ${place} 名 馬號 ${no}`}
    >
      {no}
    </span>
  );
}

function VideoTile({
  kind,
  icon,
  onClick,
}: {
  kind: VideoKind;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 bg-bg-subtle py-2.5 text-text-muted hover:text-text hover:bg-bg-elevated transition"
      title={`點擊播放 — ${videoLabel(kind)}`}
    >
      {icon}
      <span className="text-[10px] leading-tight text-center">
        {videoLabel(kind)}
      </span>
    </button>
  );
}
