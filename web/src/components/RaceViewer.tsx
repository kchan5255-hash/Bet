"use client";

import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { getRaceOddsUpdate, mergeLiveOdds } from "@/lib/live-odds";
import { findFavouriteNos, sortRunnersByProb } from "@/lib/race-client-utils";
import type {
  RaceModelKey,
  RaceRunnerView,
  RaceView,
  RaceViewerPayload,
  V19BannerView,
} from "@/lib/race-view-types";
import { useLiveOdds } from "@/lib/use-live-odds";
import { cn } from "@/lib/utils";
import { RaceSwitcher } from "./RaceSwitcher";
import { RunnerDetailDialog } from "./RunnerDetailDialog";
import { RunnerRow } from "./RunnerRow";

interface RaceViewerProps {
  payload: RaceViewerPayload;
}

export function RaceViewer({ payload }: RaceViewerProps) {
  const [raceNo, setRaceNo] = useState<number>(payload.cards[0]?.raceNo ?? 1);
  const [modelMode, setModelMode] = useState<RaceModelKey>(
    payload.v19Available ? "v19" : "pro",
  );
  const [selectedRunner, setSelectedRunner] = useState<RaceRunnerView | null>(null);
  const liveOdds = useLiveOdds(payload.date);

  const effectiveMode: RaceModelKey =
    modelMode === "v19" && !payload.v19Available ? "pro" : modelMode;
  const modelRaces = getModelRaces(payload, effectiveMode);
  const baseRace = modelRaces.find((race) => race.raceNo === raceNo) ?? modelRaces[0];

  if (!baseRace) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-elevated px-4 py-8 text-center text-sm text-text-muted">
        本期無可用賽事。
      </div>
    );
  }

  const race = mergeLiveOdds(baseRace, liveOdds.odds);
  const oddsUpdate = getRaceOddsUpdate(race, liveOdds.odds);
  const sorted = sortRunnersByProb(race.runners);
  const favs = findFavouriteNos(race);
  const v19Banner =
    effectiveMode === "v19"
      ? payload.v19Banners[String(race.raceNo)] ?? null
      : null;

  return (
    <div className="space-y-3">
      <RaceSwitcher races={payload.cards} currentRaceNo={race.raceNo} onSelect={setRaceNo} />

      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <ModelToggle
          value={modelMode}
          onChange={setModelMode}
          v19Available={payload.v19Available}
        />
        <OddsRefreshBar
          loading={liveOdds.loading}
          error={liveOdds.error}
          lastUpdate={oddsUpdate}
          fetchedAt={liveOdds.updatedAt}
          onRefresh={liveOdds.refresh}
        />
      </div>

      {effectiveMode === "v19" && <V19Banner banner={v19Banner} />}

      <RunnerList
        sorted={sorted}
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

function getModelRaces(payload: RaceViewerPayload, mode: RaceModelKey): RaceView[] {
  if (mode === "v19") {
    return payload.models.v19 ?? payload.models.pro;
  }
  return payload.models[mode];
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-card px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-bold text-text">即時賠率</div>
        <div className="truncate text-[10px] text-text-muted">
          {error
            ? "賠率更新失敗"
            : lastUpdate
              ? `HKJC ${formatShortTime(lastUpdate)}`
              : fetchedAt
                ? `已取得 ${formatShortTime(fetchedAt)}`
                : "等待中"}
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted transition hover:border-border hover:text-text disabled:opacity-50"
        title="刷新即時賠率"
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      </button>
    </div>
  );
}

function ModelToggle({
  value,
  onChange,
  v19Available,
}: {
  value: RaceModelKey;
  onChange: (value: RaceModelKey) => void;
  v19Available: boolean;
}) {
  const options: { value: RaceModelKey; label: string; disabled?: boolean }[] = [
    { value: "v19", label: "V19", disabled: !v19Available },
    { value: "pro", label: "Pro" },
    { value: "v9", label: "V9" },
  ];

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-text-muted" />
        <span className="text-xs font-bold text-text">Model</span>
      </div>
      <div className="grid grid-cols-3 rounded-lg border border-border-subtle bg-bg-subtle p-0.5">
        {options.map((option) => {
          const active = option.value === value && !option.disabled;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && onChange(option.value)}
              disabled={option.disabled}
              className={cn(
                "h-8 rounded-md px-2 text-xs font-bold transition",
                active
                  ? "bg-bg-elevated text-text shadow-sm ring-1 ring-border"
                  : "text-text-muted hover:text-text",
                option.disabled && "cursor-not-allowed opacity-40 hover:text-text-muted",
              )}
              title={option.disabled ? "Not available for this meeting" : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TableLayout({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full table-fixed">
      <colgroup>
        <col className="w-[72px]" />
        <col />
        <col className="w-[32px]" />
        <col className="w-[52px]" />
        <col className="w-[40px]" />
        <col className="w-[44px]" />
        <col className="w-[44px]" />
      </colgroup>
      {children}
    </table>
  );
}

function V19Banner({ banner }: { banner: V19BannerView | null }) {
  if (!banner) return null;

  const isPlay = banner.gate.action === "play" && banner.recommend !== null;
  if (!isPlay) {
    return (
      <div className="rounded-xl border-l-[3px] border-l-border border border-border-subtle bg-bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="text-xs font-bold text-text">V19</span>
          <span className="text-[10px] text-text-muted">
            {banner.gate.reason ?? "Skipped for this race"}
          </span>
        </div>
        {banner.gate.reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-text-muted">
            {banner.gate.reasons.slice(0, 5).map((reason) => (
              <span key={reason} className="rounded bg-bg-subtle px-1.5 py-0.5">
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const tier = banner.recommend?.tier ?? banner.gate.tier ?? "A";
  const isS = tier === "S";
  const isA = tier === "A";
  const qinT12 = banner.recommend?.qinT12;
  const qinBanker = banner.recommend?.qinBanker ?? [];

  return (
    <div
      className={cn(
        "rounded-xl border-l-[3px] border px-3 py-2",
        isS
          ? "border-l-precision border-precision/40 bg-precision/10"
          : isA
            ? "border-l-precision/60 border-precision/20 bg-precision/5"
            : "border-l-border border-border-subtle bg-bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 shrink-0 text-precision" />
        <span className="text-xs font-bold text-text">V19 Tier {tier}</span>
        {banner.gate.boost && (
          <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-text-muted">
            {banner.gate.boost}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {qinT12 && (
          <span className="rounded-md bg-precision px-2 py-1 font-bold text-white">
            T1-T2 {qinT12.label}
          </span>
        )}
        {qinBanker.length > 0 && (
          <span className="rounded-md bg-precision/80 px-2 py-1 font-bold text-white">
            Banker {qinBanker.map((combo) => combo.label).join(" / ")}
          </span>
        )}
      </div>

      {banner.gate.reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-text-muted">
          {banner.gate.reasons.slice(0, 5).map((reason) => (
            <span key={reason} className="rounded bg-bg-subtle px-1.5 py-0.5">
              {reason}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
        {banner.fieldSize !== null && <span>field={banner.fieldSize}</span>}
        {banner.gate.draw !== null && <span>draw={banner.gate.draw}</span>}
        {banner.gate.class !== null && <span>class={banner.gate.class}</span>}
        {banner.recommend?.stakeMul != null && (
          <span className="ml-auto">stake x{banner.recommend.stakeMul}</span>
        )}
      </div>
    </div>
  );
}

function RunnerList({
  sorted,
  favWinNo,
  favPlaceNo,
  onSelect,
}: {
  sorted: RaceRunnerView[];
  favWinNo?: string;
  favPlaceNo?: string;
  onSelect?: (runner: RaceRunnerView) => void;
}) {
  return (
    <div className="overflow-hidden bento-card">
      <TableLayout>
        <thead>
          <tr className="border-b border-border-subtle bg-bg-subtle text-[10px] uppercase tracking-wider text-text-subtle sticky top-0 z-10 backdrop-blur-sm">
            <Th className="pl-2 text-left">No.</Th>
            <Th className="text-left">Runner</Th>
            <Th>Draw</Th>
            <Th>Prob</Th>
            <Th>Score</Th>
            <Th>Win</Th>
            <Th>Place</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sorted.map((runner) => (
            <RunnerRow
              key={runner.no}
              runner={runner}
              showProbability
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
    <th className={`px-1 py-2 text-center font-medium ${className ?? ""}`}>
      {children}
    </th>
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
