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

      {effectiveMode === "v19" && (
        <V19Banner banner={v19Banner} runners={race.runners} />
      )}

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

function V19Banner({
  banner,
  runners,
}: {
  banner: V19BannerView | null;
  runners: RaceRunnerView[];
}) {
  if (!banner) return null;

  const isPlay = banner.gate.action === "play" && banner.recommend !== null;
  if (!isPlay) {
    return (
      <div className="rounded-xl border-l-[3px] border-l-border border border-border-subtle bg-bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="text-xs font-bold text-text">V19 不推介本場</span>
          <span className="text-[10px] text-text-muted">
            {translateGateReason(banner.gate.reason)}
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
  const stakeMul = banner.recommend?.stakeMul ?? 1;
  const nameByNo = new Map(runners.map((r) => [String(r.no), r.name]));
  const bankerPlay = buildBankerPlay(banner.recommend?.qinBanker ?? [], nameByNo);
  const boxPlay = buildBoxPlay(
    banner.recommend?.qinT12 ?? null,
    banner.recommend?.qinBanker ?? [],
    nameByNo,
  );
  const rationale = buildRationale(banner.gate.reasons, banner.gate.boost);
  const commentary = banner.recommend?.commentary?.trim() || null;

  return (
    <div
      className={cn(
        "rounded-xl border-l-[3px] border px-3 py-3 space-y-3",
        isS
          ? "border-l-precision border-precision/40 bg-precision/10"
          : isA
            ? "border-l-precision/60 border-precision/20 bg-precision/5"
            : "border-l-border border-border-subtle bg-bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 shrink-0 text-precision" />
        <span className="text-xs font-bold text-text">
          V19 推介 · {tierLabel(tier)}
        </span>
        <span className="ml-auto text-[10px] text-text-muted">
          建議注碼 ×{stakeMul}
        </span>
      </div>

      {bankerPlay && <BetSuggestion title="連贏膽拖" {...bankerPlay} />}
      {boxPlay && <BetSuggestion title="連贏全串" {...boxPlay} />}

      {commentary ? (
        <div className="rounded-lg border border-border-subtle bg-bg-card/60 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-text">
            <span>AI 點評</span>
            <span className="rounded bg-bg-subtle px-1 py-0.5 text-[9px] font-normal text-text-muted">
              Sonnet 4.6
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
            {commentary}
          </p>
        </div>
      ) : rationale.length > 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-card/60 px-3 py-2">
          <div className="text-[11px] font-bold text-text">為何推介</div>
          <ul className="mt-1.5 space-y-1 text-[11px] text-text-muted">
            {rationale.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span className="text-precision">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BetSuggestion({
  title,
  banker,
  legs,
  combos,
  combosLabel,
}: {
  title: string;
  banker?: { no: string; name: string } | null;
  legs?: { no: string; name: string }[];
  combos?: string[];
  combosLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card/60 px-3 py-2">
      <div className="text-[11px] font-bold text-text">{title}</div>
      <div className="mt-1.5 space-y-1 text-xs">
        {banker && (
          <div className="flex items-baseline gap-2">
            <span className="w-8 shrink-0 text-[10px] text-text-muted">膽</span>
            <RunnerChip no={banker.no} name={banker.name} solid />
          </div>
        )}
        {legs && legs.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="w-8 shrink-0 text-[10px] text-text-muted">拖</span>
            <span className="flex flex-wrap gap-1">
              {legs.map((leg) => (
                <RunnerChip key={leg.no} no={leg.no} name={leg.name} />
              ))}
            </span>
          </div>
        )}
        {combos && combos.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="w-8 shrink-0 text-[10px] text-text-muted">
              {combosLabel ?? "組合"}
            </span>
            <span className="flex flex-wrap gap-1">
              {combos.map((combo) => (
                <span
                  key={combo}
                  className="rounded-md bg-precision px-2 py-0.5 font-bold text-white"
                >
                  {combo}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RunnerChip({
  no,
  name,
  solid,
}: {
  no: string;
  name: string;
  solid?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
        solid
          ? "bg-precision font-bold text-white"
          : "border border-border-subtle bg-bg-subtle text-text",
      )}
    >
      <span className="font-mono">#{no}</span>
      <span>{name}</span>
    </span>
  );
}

function buildBankerPlay(
  qinBanker: { combo: string; label: string }[],
  nameByNo: Map<string, string>,
): {
  banker: { no: string; name: string };
  legs: { no: string; name: string }[];
} | null {
  if (qinBanker.length === 0) return null;
  const pairs = qinBanker
    .map((c) => c.combo.split(",").map((n) => n.trim()))
    .filter((p) => p.length === 2);
  if (pairs.length === 0) return null;

  const counts = new Map<string, number>();
  for (const [a, b] of pairs) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let bankerNo = pairs[0][0];
  let max = 0;
  for (const [no, count] of counts) {
    if (count > max) {
      max = count;
      bankerNo = no;
    }
  }
  const legSet = new Set<string>();
  for (const [a, b] of pairs) {
    if (a !== bankerNo) legSet.add(a);
    if (b !== bankerNo) legSet.add(b);
  }
  return {
    banker: { no: bankerNo, name: nameByNo.get(bankerNo) ?? "" },
    legs: Array.from(legSet).map((no) => ({
      no,
      name: nameByNo.get(no) ?? "",
    })),
  };
}

function buildBoxPlay(
  qinT12: { combo: string; label: string } | null,
  qinBanker: { combo: string; label: string }[],
  nameByNo: Map<string, string>,
): { combos: string[]; combosLabel: string } | null {
  const numbers = new Set<string>();
  if (qinT12) {
    qinT12.combo
      .split(",")
      .map((n) => n.trim())
      .forEach((n) => numbers.add(n));
  }
  for (const c of qinBanker) {
    c.combo
      .split(",")
      .map((n) => n.trim())
      .forEach((n) => numbers.add(n));
  }
  const list = Array.from(numbers);
  if (list.length < 2) return null;

  const combos: string[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const aName = nameByNo.get(a) ?? "";
      const bName = nameByNo.get(b) ?? "";
      combos.push(`#${a} ${aName} - #${b} ${bName}`);
    }
  }
  return { combos, combosLabel: `${list.length} 串 ${combos.length}` };
}

function tierLabel(tier: "S" | "A" | "B"): string {
  if (tier === "S") return "高信心 Tier S";
  if (tier === "A") return "中信心 Tier A";
  return "低信心 Tier B";
}

function buildRationale(reasons: string[], boost: string | null): string[] {
  const out: string[] = [];
  for (const raw of reasons) {
    const r = raw.trim();
    const lower = r.toLowerCase();
    if (lower.startsWith("draw=")) continue;
    if (lower.startsWith("class=")) continue;
    if (lower.startsWith("field=")) continue;
    if (lower.startsWith("middle-boost")) continue;

    if (lower === "jt-elite") {
      out.push("騎師×練馬師組合屬精英級（勝率 ≥18%）");
    } else if (lower === "jt-good") {
      out.push("騎師×練馬師組合表現良好（勝率 ≥10%）");
    } else if (lower.startsWith("j-elite")) {
      const m = r.match(/=([\d.]+)%?/);
      out.push(m ? `頭馬騎師勝率 ${m[1]}%（精英級）` : "頭馬騎師屬精英級");
    } else if (lower.startsWith("t-elite")) {
      const m = r.match(/=([\d.]+)%?/);
      out.push(m ? `頭馬練馬師勝率 ${m[1]}%（精英級）` : "頭馬練馬師屬精英級");
    } else {
      out.push(r);
    }
  }
  if (boost === "middle" || boost === "middle-boost" || boost === "middle-boost=1.5") {
    out.push("距離 1400/1600 米 V19 強 alpha 區（+1.5 加成）");
  }
  return out;
}

function translateGateReason(reason: string | null): string {
  if (!reason) return "本場跳過";
  const map: Record<string, string> = {
    "no-pick": "未達推介門檻",
    "skip-distance": "跳過此距離",
    "low-tier": "信心度不足",
    "risk-flag": "風險警示",
  };
  return map[reason] ?? reason;
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
