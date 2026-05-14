"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trophy, Wallet } from "lucide-react";
import type { PoolGroup } from "@/lib/results";
import { formatPostTimeShort } from "@/lib/results";
import { cn } from "@/lib/utils";

interface RaceMeta {
  raceNo: number;
  raceName: string;
  className: string;
  distance: number;
  course: string;
  going: string;
  time: string;
}

interface Top4Entry {
  plc: string;
  no: string;
  name: string;
  code: string;
  jockey: string;
  trainer: string;
  draw: number;
  modelRank: number | null;
  score: number | null;
}

interface ResultDetailClientProps {
  date: string;
  venue: string;
  venueName: string;
  races: { raceNo: number; postTime: string }[];
  currentRaceNo: number;
  race: RaceMeta;
  top4: Top4Entry[];
  dividends: PoolGroup[];
}

export function ResultDetailClient({
  date,
  venueName,
  races,
  currentRaceNo,
  race,
  top4,
  dividends,
}: ResultDetailClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <MobileHeader />
      <RaceSwitcher
        races={races}
        currentRaceNo={currentRaceNo}
        onSelect={(no) => router.replace(`/results/${no}`)}
      />

      <RaceMetaCard race={race} date={date} venueName={venueName} />

      <ResultsTable top4={top4} />

      {dividends.length > 0 && <DividendsTable groups={dividends} />}
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="md:hidden flex items-center gap-3">
      <Link
        href="/results"
        aria-label="返回賽果列表"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated text-text-muted hover:text-text transition"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <h1 className="flex-1 text-base font-bold text-center">賽果派彩</h1>
      <span className="w-9" />
    </div>
  );
}

function RaceSwitcher({
  races,
  currentRaceNo,
  onSelect,
}: {
  races: { raceNo: number; postTime: string }[];
  currentRaceNo: number;
  onSelect: (raceNo: number) => void;
}) {
  return (
    <nav
      aria-label="場次切換"
      className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0"
    >
      <ul className="flex items-stretch gap-1 min-w-max">
        {races.map((r) => {
          const active = r.raceNo === currentRaceNo;
          return (
            <li key={r.raceNo}>
              <button
                type="button"
                onClick={() => onSelect(r.raceNo)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-14 px-3 py-2 rounded-lg border transition",
                  active
                    ? "border-precision/60 bg-precision/15 text-precision"
                    : "border-border-subtle bg-bg-elevated text-text-muted hover:text-text",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="number-mono text-base font-black">
                  {String(r.raceNo).padStart(2, "0")}
                </span>
                <span className="number-mono text-[10px] mt-0.5">
                  {formatPostTimeShort(r.postTime)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function RaceMetaCard({
  race,
  date,
  venueName,
}: {
  race: RaceMeta;
  date: string;
  venueName: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-3">
      <div className="flex items-center gap-2 text-[11px] text-text-muted">
        <span className="number-mono">
          {String(race.raceNo).padStart(2, "0")}
        </span>
        <span>·</span>
        <span className="number-mono">{race.time}</span>
        <span>·</span>
        <span>{date}</span>
        <span>·</span>
        <span>{venueName}</span>
      </div>
      <div className="mt-1 text-base font-bold">{race.raceName}</div>
      <div className="mt-1 text-[11px] text-text-subtle">
        {race.className} · {race.distance}米 · {race.course} · {race.going}
      </div>
    </div>
  );
}

function ResultsTable({ top4 }: { top4: Top4Entry[] }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <SectionTab icon={<Trophy className="h-3.5 w-3.5" />} label="賽果" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-subtle text-[10px] uppercase tracking-wider text-text-subtle border-b border-border-subtle">
              <Th className="text-left pl-3">名次</Th>
              <Th className="text-left">馬號</Th>
              <Th className="text-left">馬名</Th>
              <Th>勝率預測 名次</Th>
              <Th>即時量感 指數</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {top4.map((r) => (
              <tr key={r.no} className="hover:bg-bg-subtle/40 transition">
                <td className="pl-3 pr-1 py-2">
                  <PlaceMedal place={Number(r.plc)} />
                </td>
                <td className="px-1 py-2 number-mono text-text-muted">
                  {r.no}
                </td>
                <td className="px-1 py-2">
                  <div className="font-bold leading-tight">{r.name}</div>
                  <div className="text-[10px] text-text-subtle truncate">
                    {r.jockey} · {r.trainer}
                  </div>
                </td>
                <td className="px-1 py-2 text-center">
                  <RankCell rank={r.modelRank} />
                </td>
                <td className="px-1 py-2 text-center">
                  <ScoreCell score={r.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DividendsTable({ groups }: { groups: PoolGroup[] }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <SectionTab icon={<Wallet className="h-3.5 w-3.5" />} label="派彩" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-subtle text-[10px] uppercase tracking-wider text-text-subtle border-b border-border-subtle">
              <Th className="text-left pl-3">彩池</Th>
              <Th className="text-left">勝出組合</Th>
              <Th className="text-right pr-3">派彩 (HK$)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {groups.flatMap((g) =>
              g.rows.map((row, idx) => (
                <tr
                  key={`${g.pool}-${idx}-${row.combo}`}
                  className="hover:bg-bg-subtle/40 transition"
                >
                  <td className="pl-3 pr-1 py-2 text-text-muted">
                    {idx === 0 ? (
                      <span className="font-semibold text-text">{g.pool}</span>
                    ) : (
                      <span className="text-transparent">{g.pool}</span>
                    )}
                  </td>
                  <td className="px-1 py-2 number-mono">{row.combo}</td>
                  <td className="pr-3 pl-1 py-2 text-right number-mono font-semibold">
                    {row.dividend}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <p className="px-3 py-2 text-[10px] leading-relaxed text-text-subtle border-t border-border-subtle">
        派彩備註:於勝出組合中,「F」代表「任何組合」;「M」則代表「任何次序」。
      </p>
    </section>
  );
}

function SectionTab({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border-subtle bg-bg-subtle">
      <span className="text-precision">{icon}</span>
      <span className="text-xs font-bold tracking-wider">{label}</span>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-1 py-2 font-medium text-center ${className ?? ""}`}>
      {children}
    </th>
  );
}

function PlaceMedal({ place }: { place: number }) {
  const tone =
    place === 1
      ? "border-warning/60 bg-warning/15 text-warning"
      : place === 2
        ? "border-text-muted/50 bg-text-muted/10 text-text"
        : place === 3
          ? "border-upset/40 bg-upset/10 text-upset-glow"
          : "border-border bg-bg-subtle text-text-muted";
  return (
    <span
      className={`number-mono inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-black ${tone}`}
    >
      {place}
    </span>
  );
}

function RankCell({ rank }: { rank: number | null }) {
  if (rank == null)
    return <span className="text-text-subtle">--</span>;
  const tone =
    rank <= 3
      ? "text-precision"
      : rank <= 6
        ? "text-warning"
        : "text-text-muted";
  return (
    <span className={`number-mono font-bold text-base ${tone}`}>{rank}</span>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null)
    return <span className="text-text-subtle">--</span>;
  const tone =
    score >= 70
      ? "text-warning"
      : score >= 50
        ? "text-text"
        : "text-text-muted";
  return (
    <span className={`number-mono font-bold text-base ${tone}`}>{score}</span>
  );
}
