import type { Runner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { JockeySilk } from "./JockeySilk";
import { ProbabilityBadge, ScoreBadge } from "./ProbabilityBadge";
import { OddsCell } from "./OddsCell";

interface RunnerRowProps {
  runner: Runner;
  showProbability?: boolean;
  favWinNo?: string;
  favPlaceNo?: string;
}

export function RunnerRow({
  runner,
  showProbability = true,
  favWinNo,
  favPlaceNo,
}: RunnerRowProps) {
  const rawScore100 = runner.rawScore * 100;

  return (
    <tr
      className={cn(
        "hover:bg-bg-elevated/40 transition",
      )}
    >
      <td className="pl-2 pr-1 py-2">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="number-mono text-xs text-text-subtle w-5 text-right tabular-nums shrink-0">
            {runner.no}
          </span>
          <JockeySilk no={runner.no} code={runner.code} size={28} />
        </div>
      </td>

      <td className="px-1 py-2">
        <div className="font-bold text-sm leading-tight truncate">
          {runner.name}
        </div>
        <div className="text-[10px] text-text-muted truncate">
          {runner.jockey} · {runner.trainer}
        </div>
      </td>

      <td className="px-0.5 py-2 text-center number-mono text-xs text-text-muted">
        {runner.draw}
      </td>

      {showProbability && (
        <td className="px-0.5 py-2 text-center">
          <ProbabilityBadge value={runner.modelProbability} size="sm" />
        </td>
      )}

      <td className="px-0.5 py-2 text-center">
        <ScoreBadge value={rawScore100} size="sm" />
      </td>

      <td className="px-0.5 py-2 text-center">
        <OddsCell
          value={runner.winOdds}
          kind="win"
          favourite={favWinNo === runner.no}
          size="sm"
        />
      </td>

      <td className="px-0.5 py-2 text-center">
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
