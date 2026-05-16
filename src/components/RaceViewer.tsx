"use client";

import { useState } from "react";
import type { Race, Runner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getRaceOddsUpdate, mergeLiveOdds } from "@/lib/live-odds";
import {
  sortRunnersByProb,
  getColdBurstPicks,
  findFavouriteNos,
  type ColdBurstRunner,
} from "@/lib/data";
import { applyProfessionalModel } from "@/lib/professional-model";
import { applyV9Model } from "@/lib/v9-model";
import { useLiveOdds } from "@/lib/use-live-odds";
import { useSubscription } from "@/lib/subscription";
import { RaceSwitcher } from "./RaceSwitcher";
import { RunnerRow } from "./RunnerRow";
import { RunnerDetailDialog } from "./RunnerDetailDialog";
import { PaywallOverlay } from "./PaywallOverlay";
import { Sparkles, AlertTriangle, RefreshCw, SlidersHorizontal } from "lucide-react";

interface RaceViewerProps {
  races: Race[];
  date?: string;
}

export function RaceViewer({ races, date }: RaceViewerProps) {
  const [raceNo, setRaceNo] = useState<number>(races[0]?.raceNo ?? 1);
  const [modelMode, setModelMode] = useState<"pro" | "v9">("pro");
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);
  const liveOdds = useLiveOdds();
  const baseRace = races.find((r) => r.raceNo === raceNo) ?? races[0];
  const modelRace =
    modelMode === "v9"
      ? applyV9Model(baseRace, date)
      : applyProfessionalModel(baseRace);
  const race = mergeLiveOdds(modelRace, liveOdds.odds);
  const oddsUpdate = getRaceOddsUpdate(race, liveOdds.odds);
  const sorted = sortRunnersByProb(race.runners);
  const coldBurst = getColdBurstPicks(race);
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

      {ready && coldBurst.length > 0 && (
        <>
          {isPro ? (
            <ColdBurstCard
              picks={coldBurst}
              favWinNo={favs.win}
              favPlaceNo={favs.place}
              onSelect={setSelectedRunner}
            />
          ) : (
            <PaywallOverlay
              title="升級解鎖冷門黑馬"
              description="查看本場兩匹隱藏冷門爆點馬"
              className="min-h-[180px]"
            >
              <ColdBurstCard
                picks={coldBurst}
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
        onSelect={setSelectedRunner}
      />

      <RunnerDetailDialog
        runner={selectedRunner}
        onClose={() => setSelectedRunner(null)}
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
  value: "pro" | "v9";
  onChange: (value: "pro" | "v9") => void;
}) {
  const options = [
    { value: "pro" as const, label: "Pro" },
    { value: "v9" as const, label: "V9" },
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

function ColdBurstCard({
  picks,
  favWinNo,
  favPlaceNo,
  onSelect,
}: {
  picks: ColdBurstRunner[];
  favWinNo?: string;
  favPlaceNo?: string;
  onSelect?: (runner: Runner) => void;
}) {
  return (
    <div className="rounded-xl border border-upset/30 bg-bg-elevated overflow-hidden shadow-[0_0_24px_-12px_rgba(139,92,246,0.5)]">
      <div className="relative flex items-center gap-2.5 bg-gradient-to-r from-upset/25 via-upset/10 to-transparent px-3 py-2.5 border-b border-upset/20">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-upset-glow to-upset" />
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-upset/20 ring-1 ring-upset/40">
          <Sparkles className="h-3.5 w-3.5 text-upset-glow" />
        </span>
        <h3 className="text-sm font-extrabold tracking-wide text-upset-glow">
          冷門黑馬
        </h3>
        <span className="ml-auto rounded-md border border-upset/30 bg-upset/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-upset-glow uppercase">
          隱藏爆點推介
        </span>
      </div>
      <TableLayout showProb>
        <tbody className="divide-y divide-border-subtle">
          {picks.map(({ runner }) => (
            <RunnerRow
              key={runner.no}
              runner={runner}
              favWinNo={favWinNo}
              favPlaceNo={favPlaceNo}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </TableLayout>
      <div className="flex items-start gap-2 border-t border-warning/20 bg-warning/5 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        <p className="text-[10px] leading-relaxed text-warning/90">
          冷門爆點僅供參考,命中率較低、波動較大,請謹慎選擇。
        </p>
      </div>
    </div>
  );
}

function RunnerList({
  sorted,
  showProb,
  favWinNo,
  favPlaceNo,
  onSelect,
}: {
  sorted: Runner[];
  showProb: boolean;
  favWinNo?: string;
  favPlaceNo?: string;
  onSelect?: (runner: Runner) => void;
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
              onSelect={onSelect}
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
