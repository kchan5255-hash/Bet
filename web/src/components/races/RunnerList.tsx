"use client";

import type { RaceRunnerView } from "@/lib/race-view-types";
import { RunnerCard } from "./RunnerCard";
import { RunnerTableRow } from "./RunnerTableRow";

interface RunnerListProps {
  runners: RaceRunnerView[];
  bankerNo: string | null;
  legNos: Set<string>;
  favWinNo?: string;
  favPlaceNo?: string;
  onSelect?: (runner: RaceRunnerView) => void;
}

export function RunnerList({
  runners,
  bankerNo,
  legNos,
  favWinNo,
  favPlaceNo,
  onSelect,
}: RunnerListProps) {
  const sorted = [...runners].sort(
    (a, b) => b.modelProbability - a.modelProbability,
  );
  const pickOf = (no: string) =>
    no === bankerNo ? "banker" : legNos.has(no) ? "leg" : null;

  return (
    <div className="bento-card overflow-hidden">
      <div className="border-b border-border-subtle bg-bg-subtle px-3 py-2 text-[10px] uppercase tracking-wider text-text-subtle">
        {sorted.length} 匹參賽馬 · 按勝率排序
      </div>

      {/* 桌面 table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col />
            <col className="w-[40px]" />
            <col className="w-[140px]" />
            <col className="w-[44px]" />
            <col className="w-[52px]" />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle text-[10px] uppercase tracking-wider text-text-subtle">
              <th className="pl-2 px-1 py-2 text-left font-medium">馬號</th>
              <th className="px-1 py-2 text-left font-medium">馬匹</th>
              <th className="px-1 py-2 text-center font-medium">檔位</th>
              <th className="px-1 py-2 text-center font-medium">勝率</th>
              <th className="px-1 py-2 text-center font-medium">評分</th>
              <th className="px-1 py-2 text-center font-medium">獨贏</th>
              <th className="px-1 py-2 text-center font-medium">位置</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sorted.map((runner) => (
              <RunnerTableRow
                key={runner.no}
                runner={runner}
                pick={pickOf(runner.no)}
                favWinNo={favWinNo}
                favPlaceNo={favPlaceNo}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機 card grid */}
      <div className="md:hidden grid grid-cols-1 gap-2 p-2">
        {sorted.map((runner) => (
          <RunnerCard
            key={runner.no}
            runner={runner}
            pick={pickOf(runner.no)}
            favWinNo={favWinNo}
            favPlaceNo={favPlaceNo}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
