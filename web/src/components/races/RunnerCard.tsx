import type { RaceRunnerView } from "@/lib/race-view-types";
import { cn } from "@/lib/utils";
import { JockeySilk } from "../JockeySilk";
import { OddsCell } from "../OddsCell";
import { ProbabilityBar } from "./ProbabilityBar";
import { ScoreRing } from "./ScoreRing";

type Pick = "banker" | "leg" | null;

interface RunnerCardProps {
  runner: RaceRunnerView;
  pick: Pick;
  favWinNo?: string;
  favPlaceNo?: string;
  onSelect?: (runner: RaceRunnerView) => void;
}

export function RunnerCard({
  runner,
  pick,
  favWinNo,
  favPlaceNo,
  onSelect,
}: RunnerCardProps) {
  const rawScore100 = runner.rawScore * 100;
  const clickable = Boolean(onSelect);

  return (
    <button
      type="button"
      onClick={onSelect ? () => onSelect(runner) : undefined}
      disabled={!clickable}
      aria-label={
        clickable
          ? `查看 ${runner.no} ${runner.name} 詳細資料${pick === "banker" ? "（V19 膽）" : pick === "leg" ? "（V19 拖）" : ""}`
          : undefined
      }
      className={cn(
        "relative w-full overflow-hidden rounded-xl border bg-bg-card p-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-ai-start",
        pick === "banker" && "border-precision/40 bg-precision/[0.06]",
        pick === "leg" && "border-precision/25",
        !pick && "border-border-subtle",
        clickable && "hover:border-text-muted active:scale-[0.99]",
      )}
    >
      {pick && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0 h-full w-[3px]",
            pick === "banker" ? "bg-precision" : "ai-gradient",
          )}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="number-mono text-base font-black tabular-nums leading-none">
            {runner.no}
          </span>
          <JockeySilk no={runner.no} code={runner.code} size={32} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm leading-tight truncate">
                  {runner.name}
                </span>
                {pick === "banker" && (
                  <span className="rounded-sm bg-precision px-1 text-[9px] font-black uppercase text-white">
                    膽
                  </span>
                )}
                {pick === "leg" && (
                  <span className="rounded-sm border border-precision/40 px-1 text-[9px] font-black uppercase text-precision-glow">
                    拖
                  </span>
                )}
              </div>
              <div className="text-[10px] text-text-muted truncate mt-0.5">
                {runner.jockey} · {runner.trainer} · 檔 {runner.draw}
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-1.5">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-text-subtle leading-none">
                  獨贏
                </span>
                <OddsCell
                  value={runner.winOdds}
                  kind="win"
                  favourite={favWinNo === runner.no}
                  size="sm"
                />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-text-subtle leading-none">
                  位置
                </span>
                <OddsCell
                  value={runner.placeOdds}
                  kind="place"
                  favourite={favPlaceNo === runner.no}
                  size="sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <ProbabilityBar
              value={runner.modelProbability}
              size="sm"
              className="flex-1"
            />
            <ScoreRing value={rawScore100} size={28} />
          </div>
        </div>
      </div>
    </button>
  );
}
