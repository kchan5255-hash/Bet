import type { RaceRunnerView } from "@/lib/race-view-types";
import { cn } from "@/lib/utils";
import { JockeySilk } from "../JockeySilk";
import { OddsCell } from "../OddsCell";
import { ProbabilityBar } from "./ProbabilityBar";
import { ScoreRing } from "./ScoreRing";

type Pick = "banker" | "leg" | null;

interface RunnerTableRowProps {
  runner: RaceRunnerView;
  pick: Pick;
  favWinNo?: string;
  favPlaceNo?: string;
  onSelect?: (runner: RaceRunnerView) => void;
}

export function RunnerTableRow({
  runner,
  pick,
  favWinNo,
  favPlaceNo,
  onSelect,
}: RunnerTableRowProps) {
  const rawScore100 = runner.rawScore * 100;
  const clickable = Boolean(onSelect);

  const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (!onSelect) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(runner);
    }
  };

  return (
    <tr
      onClick={onSelect ? () => onSelect(runner) : undefined}
      onKeyDown={handleKey}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        clickable
          ? `查看 ${runner.no} ${runner.name} 詳細資料${pick === "banker" ? "（V19 膽）" : pick === "leg" ? "（V19 拖）" : ""}`
          : undefined
      }
      className={cn(
        "transition-colors duration-150 outline-none",
        pick === "banker" && "bg-precision/[0.10] border-l-2 border-l-precision",
        pick === "leg" && "bg-precision/[0.05] border-l-2 border-l-precision/40",
        clickable
          ? "cursor-pointer hover:bg-bg-card/80 focus-visible:bg-bg-card/80 focus-visible:ring-1 focus-visible:ring-precision/60"
          : "hover:bg-bg-elevated/40",
      )}
    >
      <td className="pl-2 pr-1 py-2.5">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="number-mono text-xs text-text-subtle w-5 text-right tabular-nums shrink-0">
            {runner.no}
          </span>
          <JockeySilk no={runner.no} code={runner.code} size={28} />
        </div>
      </td>

      <td className="px-1 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="font-bold text-sm leading-tight truncate">
            {runner.name}
          </div>
          {pick === "banker" && (
            <span
              aria-hidden
              className="rounded-sm bg-precision px-1 text-[9px] font-black uppercase text-white"
            >
              膽
            </span>
          )}
          {pick === "leg" && (
            <span
              aria-hidden
              className="rounded-sm border border-precision/40 px-1 text-[9px] font-black uppercase text-precision-glow"
            >
              拖
            </span>
          )}
        </div>
        <div className="text-[10px] text-text-muted truncate">
          {runner.jockey} · {runner.trainer}
        </div>
      </td>

      <td className="px-0.5 py-2.5 text-center number-mono text-xs text-text-muted">
        {runner.draw}
      </td>

      <td className="px-1.5 py-2.5">
        <ProbabilityBar value={runner.modelProbability} size="sm" />
      </td>

      <td className="px-0.5 py-2.5">
        <div className="flex items-center justify-center">
          <ScoreRing value={rawScore100} size={28} />
        </div>
      </td>

      <td className="px-0.5 py-2.5 text-center">
        <OddsCell
          value={runner.winOdds}
          kind="win"
          favourite={favWinNo === runner.no}
          size="sm"
        />
      </td>

      <td className="px-0.5 py-2.5 text-center">
        <OddsCell
          value={runner.placeOdds}
          kind="place"
          favourite={favPlaceNo === runner.no}
          size="sm"
        />
      </td>
    </tr>
  );
}
