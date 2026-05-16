"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

interface RaceSwitcherEntry {
  raceNo: number;
  postTime: string;
  className: string;
  distance: number;
  going: string;
  course: string;
  raceName: string;
}

interface Top4Entry {
  plc: string;
  no: string;
  name: string;
  code: string;
  jockey: string;
  trainer: string;
  draw: number;
  proRank: number | null;
  proScore: number | null;
  v9Rank: number | null;
  v9Score: number | null;
}

interface ResultDetailClientProps {
  date: string;
  venue: string;
  venueName: string;
  races: RaceSwitcherEntry[];
  currentRaceNo: number;
  race: RaceMeta;
  top4: Top4Entry[];
  dividends: PoolGroup[];
}

export function ResultDetailClient({
  date,
  races,
  currentRaceNo,
  top4,
  dividends,
}: ResultDetailClientProps) {
  const router = useRouter();
  const backHref = `/results?date=${date}`;

  return (
    <div className="space-y-3">
      <MobileHeader backHref={backHref} />
      <DesktopHeader backHref={backHref} />
      <RaceSwitcher
        races={races}
        currentRaceNo={currentRaceNo}
        onSelect={(no) => router.replace(`/results/${no}?date=${date}`)}
      />

      <ResultsTable top4={top4} />

      {dividends.length > 0 && <DividendsTable groups={dividends} />}
    </div>
  );
}

function MobileHeader({ backHref }: { backHref: string }) {
  return (
    <div className="md:hidden flex items-center gap-3">
      <Link
        href={backHref}
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

function DesktopHeader({ backHref }: { backHref: string }) {
  return (
    <div className="hidden md:flex items-center gap-3 mb-2">
      <Link
        href={backHref}
        aria-label="返回賽果列表"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-muted hover:text-text transition"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <h1 className="text-2xl md:text-3xl font-black tracking-tight">
        賽果派彩
      </h1>
    </div>
  );
}

function RaceSwitcher({
  races,
  currentRaceNo,
  onSelect,
}: {
  races: RaceSwitcherEntry[];
  currentRaceNo: number;
  onSelect: (raceNo: number) => void;
}) {
  const current = races.find((r) => r.raceNo === currentRaceNo) ?? races[0];
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentRaceNo]);

  if (!current) return null;

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-3 bg-gradient-to-br from-upset/30 to-upset/10 px-4 py-3 flex-shrink-0 border-r border-border-subtle">
          <div className="number-mono text-3xl font-black text-white">
            {String(current.raceNo).padStart(2, "0")}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-text-muted font-medium">
              {formatPostTimeShort(current.postTime)} · {current.going}
            </div>
            <div className="text-sm font-bold truncate">
              {current.className},{current.distance}米
            </div>
            <div className="text-[11px] text-text-muted truncate">
              {current.raceName}
            </div>
          </div>
        </div>

        <div
          className="flex gap-px overflow-x-auto flex-1"
          style={{ scrollbarWidth: "none" }}
        >
          {races.map((r) => {
            const active = r.raceNo === currentRaceNo;
            return (
              <button
                key={r.raceNo}
                ref={active ? activeRef : null}
                type="button"
                onClick={() => onSelect(r.raceNo)}
                className={cn(
                  "flex-shrink-0 w-16 py-3 text-center transition-all",
                  active
                    ? "bg-upset/20 border-b-2 border-upset"
                    : "bg-bg-subtle hover:bg-bg-elevated border-b-2 border-transparent",
                )}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={cn(
                    "number-mono text-lg font-bold",
                    active ? "text-white" : "text-text-muted",
                  )}
                >
                  {String(r.raceNo).padStart(2, "0")}
                </div>
                <div className="text-[10px] text-text-subtle mt-0.5">
                  {formatPostTimeShort(r.postTime)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ top4 }: { top4: Top4Entry[] }) {
  const [model, setModel] = useState<"pro" | "v9">("pro");
  return (
    <section className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border-subtle bg-bg-subtle">
        <div className="flex items-center gap-1.5">
          <span className="text-precision">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold tracking-wider">賽果</span>
        </div>
        <div className="grid grid-cols-2 rounded-md border border-border-subtle bg-bg-elevated p-0.5">
          {(["pro", "v9"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setModel(option)}
              className={cn(
                "h-7 px-3 text-[11px] font-bold transition rounded",
                model === option
                  ? "bg-precision text-white shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {option === "pro" ? "Pro" : "V9"}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-subtle text-[10px] uppercase tracking-wider text-text-subtle border-b border-border-subtle">
              <Th className="text-left pl-3">名次</Th>
              <Th className="text-left">馬號</Th>
              <Th className="text-left">馬名</Th>
              <Th>{model === "pro" ? "Pro" : "V9"} 名次</Th>
              <Th>{model === "pro" ? "Pro" : "V9"} 指數</Th>
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
                  <RankCell rank={model === "pro" ? r.proRank : r.v9Rank} />
                </td>
                <td className="px-1 py-2 text-center">
                  <ScoreCell score={model === "pro" ? r.proScore : r.v9Score} />
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
