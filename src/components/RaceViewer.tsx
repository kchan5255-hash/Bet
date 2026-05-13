"use client";

import { useState } from "react";
import type { Race, Runner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getRaceOddsUpdate, mergeLiveOdds } from "@/lib/live-odds";
import {
  sortRunnersByProb,
  getTopFour,
  getDarkHorse,
  findFavouriteNos,
} from "@/lib/data";
import { applyProfessionalModel } from "@/lib/professional-model";
import { useLiveOdds } from "@/lib/use-live-odds";
import { useSubscription } from "@/lib/subscription";
import { RaceSwitcher } from "./RaceSwitcher";
import { RunnerRow } from "./RunnerRow";
import { PaywallOverlay } from "./PaywallOverlay";
import { Flame, RefreshCw, SlidersHorizontal } from "lucide-react";

interface RaceViewerProps {
  races: Race[];
}

export function RaceViewer({ races }: RaceViewerProps) {
  const [raceNo, setRaceNo] = useState<number>(races[0]?.raceNo ?? 1);
  const [modelMode, setModelMode] = useState<"original" | "professional">(
    "original",
  );
  const liveOdds = useLiveOdds();
  const baseRace = races.find((r) => r.raceNo === raceNo) ?? races[0];
  const modelRace =
    modelMode === "professional"
      ? applyProfessionalModel(baseRace)
      : baseRace;
  const race = mergeLiveOdds(modelRace, liveOdds.odds);
  const oddsUpdate = getRaceOddsUpdate(race, liveOdds.odds);
  const sorted = sortRunnersByProb(race.runners);
  const topFour = getTopFour(race);
  const darkHorse = getDarkHorse(race);
  const favs = findFavouriteNos(race);
  const { isPro, ready } = useSubscription();

  return (
    <div className="space-y-3">
      <RaceSwitcher races={races} currentRaceNo={raceNo} onSelect={setRaceNo} />
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <ModelToggle value={modelMode} onChange={setModelMode} />
        <OddsRefreshBar
          loading={liveOdds.loading}
          error={liveOdds.error}
          lastUpdate={oddsUpdate}
          fetchedAt={liveOdds.updatedAt}
          onRefresh={liveOdds.refresh}
        />
      </div>

      {ready && (
        <>
          {isPro ? (
            <TopPicksCard
              runners={topFour}
              darkHorse={darkHorse}
              favWinNo={favs.win}
              favPlaceNo={favs.place}
            />
          ) : (
            <PaywallOverlay
              title="升級解鎖 AI 推介"
              description="查看本場 AI 評選四大數據推介、冷門黑馬、正負面因素分析"
              className="min-h-[180px]"
            >
              <TopPicksCard
                runners={topFour}
                darkHorse={darkHorse}
                favWinNo={favs.win}
                favPlaceNo={favs.place}
              />
            </PaywallOverlay>
          )}
        </>
      )}

      <RunnerList
        sorted={sorted}
        showProb={isPro}
        favWinNo={favs.win}
        favPlaceNo={favs.place}
      />
    </div>
  );
}

function OddsRefreshBar({
  loading,
  error,
  lastUpdate,
  fetchedAt,
  onRefresh,
}: {
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  fetchedAt: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-bold text-text">Live Odds</div>
        <div className="text-[10px] text-text-muted truncate">
          {error
            ? "Odds refresh failed"
            : lastUpdate
              ? `HKJC ${formatShortTime(lastUpdate)}`
              : fetchedAt
                ? `Fetched ${formatShortTime(fetchedAt)}`
                : "Waiting"}
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted transition hover:text-text disabled:opacity-50"
        title="Refresh live odds"
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      </button>
    </div>
  );
}

function formatShortTime(value: string): string {
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
    return value.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*/, "");
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return value;
}

function ModelToggle({
  value,
  onChange,
}: {
  value: "original" | "professional";
  onChange: (value: "original" | "professional") => void;
}) {
  const options = [
    { value: "original" as const, label: "Original" },
    { value: "professional" as const, label: "Professional" },
  ];

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <SlidersHorizontal className="h-4 w-4 text-text-muted shrink-0" />
        <span className="text-xs font-bold text-text">Model</span>
      </div>
      <div className="grid grid-cols-2 rounded-lg border border-border-subtle bg-bg-subtle p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "h-8 px-3 text-xs font-bold transition rounded-md",
                active
                  ? "bg-precision text-white shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableLayout({
  showProb,
  children,
}: {
  showProb: boolean;
  children: React.ReactNode;
}) {
  return (
    <table className="w-full table-fixed">
      <colgroup>
        <col className="w-[72px]" />
        <col />
        <col className="w-[32px]" />
        {showProb && <col className="w-[52px]" />}
        <col className="w-[40px]" />
        <col className="w-[44px]" />
        <col className="w-[44px]" />
      </colgroup>
      {children}
    </table>
  );
}

function TopPicksCard({
  runners,
  darkHorse,
  favWinNo,
  favPlaceNo,
}: {
  runners: Runner[];
  darkHorse: Runner | null;
  favWinNo?: string;
  favPlaceNo?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="flex items-center gap-2 bg-gradient-to-r from-precision/20 to-transparent px-3 py-2 border-b border-border-subtle">
        <Flame className="h-4 w-4 text-precision" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-precision">
          AI 推介
        </h3>
        <span className="text-[10px] text-text-muted">
          四大數據推介 + 冷門黑馬
        </span>
      </div>
      <TableLayout showProb>
        <tbody className="divide-y divide-border-subtle">
          {runners.map((r) => (
            <RunnerRow
              key={r.no}
              runner={r}
              favWinNo={favWinNo}
              favPlaceNo={favPlaceNo}
            />
          ))}
          {darkHorse && (
            <>
              <tr className="bg-bg-subtle/60">
                <td
                  colSpan={7}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-subtle"
                >
                  冷門推介
                </td>
              </tr>
              <RunnerRow
                key={`dark-${darkHorse.no}`}
                runner={darkHorse}
                favWinNo={favWinNo}
                favPlaceNo={favPlaceNo}
              />
            </>
          )}
        </tbody>
      </TableLayout>
    </div>
  );
}

function RunnerList({
  sorted,
  showProb,
  favWinNo,
  favPlaceNo,
}: {
  sorted: Runner[];
  showProb: boolean;
  favWinNo?: string;
  favPlaceNo?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
      <TableLayout showProb={showProb}>
        <thead>
          <tr className="bg-bg-subtle text-[10px] uppercase tracking-wider text-text-subtle border-b border-border-subtle">
            <Th className="text-left pl-2">馬號</Th>
            <Th className="text-left">馬名</Th>
            <Th>檔</Th>
            {showProb && <Th>勝率</Th>}
            <Th>指數</Th>
            <Th>獨贏</Th>
            <Th>位置</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sorted.map((r) => (
            <RunnerRow
              key={r.no}
              runner={r}
              showProbability={showProb}
              favWinNo={favWinNo}
              favPlaceNo={favPlaceNo}
            />
          ))}
        </tbody>
      </TableLayout>
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
