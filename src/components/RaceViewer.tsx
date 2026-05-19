"use client";

import { useState } from "react";
import type { Race, Runner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getRaceOddsUpdate, mergeLiveOdds } from "@/lib/live-odds";
import { sortRunnersByProb, findFavouriteNos } from "@/lib/data";
import { applyProfessionalModel } from "@/lib/professional-model";
import { applyV9Model } from "@/lib/v9-model";
import {
  applyV19Model,
  getV19Recommend,
  getV19Entry,
  isV19Available,
} from "@/lib/v19-model";
import { useLiveOdds } from "@/lib/use-live-odds";
import { useSubscription } from "@/lib/subscription";
import { RaceSwitcher } from "./RaceSwitcher";
import { RunnerRow } from "./RunnerRow";
import { RunnerDetailDialog } from "./RunnerDetailDialog";
import { PaywallOverlay } from "./PaywallOverlay";
import { AlertTriangle, RefreshCw, SlidersHorizontal, Target } from "lucide-react";

interface RaceViewerProps {
  races: Race[];
  date?: string;
}

type ModelMode = "v19" | "pro" | "v9";

export function RaceViewer({ races, date }: RaceViewerProps) {
  const [raceNo, setRaceNo] = useState<number>(races[0]?.raceNo ?? 1);
  const v19Available = isV19Available(date);
  const [modelMode, setModelMode] = useState<ModelMode>(v19Available ? "v19" : "pro");
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);
  const liveOdds = useLiveOdds();
  const baseRace = races.find((r) => r.raceNo === raceNo) ?? races[0];
  const effectiveMode: ModelMode = (() => {
    if (modelMode === "v19" && !v19Available) return "pro";
    return modelMode;
  })();
  const modelRace =
    effectiveMode === "v9"
      ? applyV9Model(baseRace, date)
      : effectiveMode === "v19"
        ? applyV19Model(baseRace, date)
        : applyProfessionalModel(baseRace);
  const race = mergeLiveOdds(modelRace, liveOdds.odds);
  const oddsUpdate = getRaceOddsUpdate(race, liveOdds.odds);
  const sorted = sortRunnersByProb(race.runners);
  const favs = findFavouriteNos(race);
  const { isPro, ready } = useSubscription();

  const v19Entry = effectiveMode === "v19" ? getV19Entry(date, race.raceNo) : null;
  const v19Recommend = effectiveMode === "v19" ? getV19Recommend(date, race.raceNo) : null;

  return (
    <div className="space-y-3">
      <RaceSwitcher races={races} currentRaceNo={raceNo} onSelect={setRaceNo} />
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <ModelToggle
          value={modelMode}
          onChange={setModelMode}
          v19Available={v19Available}
        />
        <OddsRefreshBar
          loading={liveOdds.loading}
          error={liveOdds.error}
          lastUpdate={oddsUpdate}
          fetchedAt={liveOdds.updatedAt}
          onRefresh={liveOdds.refresh}
        />
      </div>

      {effectiveMode === "v19" && (
        <V19Banner
          entry={v19Entry}
          recommend={v19Recommend}
          isPro={isPro}
        />
      )}

      {ready && (
        <RunnerList
          sorted={sorted}
          showProb={isPro}
          favWinNo={favs.win}
          favPlaceNo={favs.place}
          onSelect={setSelectedRunner}
        />
      )}

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
  v19Available,
}: {
  value: ModelMode;
  onChange: (value: ModelMode) => void;
  v19Available: boolean;
}) {
  const options: { value: ModelMode; label: string; disabled?: boolean }[] = [
    { value: "v19", label: "V19 ★", disabled: !v19Available },
    { value: "pro", label: "Pro" },
    { value: "v9", label: "V9" },
  ];

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <SlidersHorizontal className="h-4 w-4 text-text-muted shrink-0" />
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
                "h-8 px-2 text-xs font-bold transition rounded-md",
                active
                  ? "bg-precision text-white shadow-sm"
                  : "text-text-muted hover:text-text",
                option.disabled && "opacity-40 cursor-not-allowed hover:text-text-muted",
              )}
              title={option.disabled ? "未提供當日推介數據" : undefined}
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

function V19Banner({
  entry,
  recommend,
  isPro,
}: {
  entry: ReturnType<typeof getV19Entry>;
  recommend: ReturnType<typeof getV19Recommend>;
  isPro: boolean;
}) {
  if (!entry) return null;
  const isPlay = entry.gate.action === "play" && recommend !== null;
  if (!isPlay) {
    const skipReason = entry.gate.reason || "唔過 V19 條件";
    const reasonText = skipReason.startsWith("bad-distance")
      ? `距離 filter 跳過此場（${skipReason.replace("bad-distance=", "")}）`
      : skipReason === "v18-skip"
        ? "V18 風險 gate 跳過"
        : skipReason === "no-pick"
          ? "無 V14 推介"
          : `跳過此場（${skipReason}）`;
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-text-muted shrink-0" />
          <span className="text-xs font-bold text-text">V19</span>
          <span className="text-[10px] text-text-muted">{reasonText}</span>
        </div>
      </div>
    );
  }

  const tier = recommend?.tier ?? entry.gate.tier ?? "A";
  const isS = tier === "S";
  const isA = tier === "A";
  const recT12 = recommend?.qinT12;
  const recBanker = recommend?.qinBanker ?? [];
  const stakeMul = recommend?.stakeMul ?? 1.0;
  const reasons = entry.gate.reasons || [];
  const boost = entry.gate.boost;

  if (!isPro) {
    return (
      <PaywallOverlay
        title="升級解鎖 V19 推介"
        description={`Tier ${tier} — 連贏 / 位置Q 推介`}
        className="min-h-[110px]"
      >
        <div className="rounded-xl border border-precision/40 bg-precision/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-precision" />
            <span className="text-xs font-bold text-text">V19 推介</span>
          </div>
        </div>
      </PaywallOverlay>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        isS
          ? "border-precision bg-precision/10"
          : isA
            ? "border-precision/40 bg-precision/5"
            : "border-border-subtle bg-bg-elevated",
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-precision shrink-0" />
        <span className="text-xs font-bold text-text">
          V19 — Tier {tier} {isS && "★"}
          {boost === "middle" && (
            <span className="ml-1 text-[10px] text-precision">middle-boost</span>
          )}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">
          {isS
            ? "ROI +78.5% (212 場)"
            : isA
              ? "ROI +26.1% (225 場)"
              : "ROI +18.5% (94 場)"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-precision px-2 py-1 font-bold text-white">
          連贏單注 {recT12?.label}
        </span>
        {recBanker.length > 0 && (
          <span className="rounded-md bg-precision/80 px-2 py-1 font-bold text-white">
            連贏膽拖 {recBanker.map((c) => c.label).join(" / ")}
          </span>
        )}
        {recBanker.length > 0 && (
          <span className="rounded-md bg-bg-subtle px-2 py-1 text-text-muted">
            位置Q膽拖 {recBanker.map((c) => c.label).join(" / ")}
          </span>
        )}
      </div>
      {reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-text-muted">
          {reasons.slice(0, 5).map((r) => (
            <span key={r} className="rounded bg-bg-subtle px-1.5 py-0.5">{r}</span>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
        {entry.fieldSize !== null && <span>field={entry.fieldSize}</span>}
        {entry.gate.draw !== null && <span>檔={entry.gate.draw}</span>}
        {entry.gate.class !== null && <span>第{entry.gate.class}班</span>}
        <span className="ml-auto">注額 ×{stakeMul}</span>
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
