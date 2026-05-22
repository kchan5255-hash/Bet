import { Clock } from "lucide-react";
import { formatPostTime } from "@/lib/meeting-utils";
import type { RaceCardMeta, RaceView } from "@/lib/race-view-types";

interface CurrentRaceCardProps {
  race: RaceView | RaceCardMeta;
}

export function CurrentRaceCard({ race }: CurrentRaceCardProps) {
  return (
    <article
      className="bento-card relative overflow-hidden p-4 md:p-5"
      aria-label={`第 ${race.raceNo} 場 ${race.raceName}`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px] ai-gradient"
      />
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <div className="text-[9px] uppercase tracking-widest text-text-subtle">
            Race
          </div>
          <div className="number-mono text-4xl font-black leading-none md:text-5xl">
            {String(race.raceNo).padStart(2, "0")}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Chip>{race.distance}米</Chip>
            <Chip>{race.className}</Chip>
            <Chip>{race.course}</Chip>
            <Chip>{race.going}</Chip>
            <Chip icon={<Clock className="h-3 w-3" aria-hidden />}>
              {formatPostTime(race.postTime)}
            </Chip>
          </div>
          <div className="mt-2 truncate text-sm font-bold text-text md:text-base">
            {race.raceName}
          </div>
        </div>
      </div>
    </article>
  );
}

function Chip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[10px] text-text-muted md:text-[11px]">
      {icon}
      <span>{children}</span>
    </span>
  );
}
