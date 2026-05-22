"use client";

import { Suspense, useState } from "react";
import { getRaceOddsUpdate, mergeLiveOdds } from "@/lib/live-odds";
import { findFavouriteNos } from "@/lib/race-client-utils";
import type {
  RaceModelKey,
  RaceRunnerView,
  RaceView,
  RaceViewerPayload,
} from "@/lib/race-view-types";
import { useLiveOdds } from "@/lib/use-live-odds";
import { ControlBar } from "./races/ControlBar";
import { CurrentRaceCard } from "./races/CurrentRaceCard";
import { EmptyMeeting } from "./races/EmptyMeeting";
import { PredictionPaywall } from "./races/PredictionPaywall";
import { RaceSkipCard } from "./races/RaceSkipCard";
import { RaceTabs } from "./races/RaceTabs";
import { RunnerList } from "./races/RunnerList";
import { V19BannerCard } from "./races/V19BannerCard";
import { buildBankerPlay, buildBoxPlay, buildNameByNo } from "./races/utils";
import { useRaceState } from "./races/useRaceState";
import { RunnerDetailDialog } from "./RunnerDetailDialog";

interface RaceViewerProps {
  payload: RaceViewerPayload;
}

export function RaceViewer({ payload }: RaceViewerProps) {
  return (
    <Suspense fallback={null}>
      <RaceViewerInner payload={payload} />
    </Suspense>
  );
}

function RaceViewerInner({ payload }: RaceViewerProps) {
  const { raceNo, modelMode, setRaceNo, setModelMode } = useRaceState({
    defaultRaceNo: payload.cards[0]?.raceNo ?? 1,
    v19Available: payload.v19Available,
    totalRaces: payload.cards.length,
  });

  const [selectedRunner, setSelectedRunner] = useState<RaceRunnerView | null>(null);
  const liveOdds = useLiveOdds(payload.date);

  const effectiveMode: RaceModelKey =
    modelMode === "v19" && !payload.v19Available ? "pro" : modelMode;
  const modelRaces = getModelRaces(payload, effectiveMode);
  const baseRace = modelRaces.find((r) => r.raceNo === raceNo) ?? modelRaces[0];

  if (!baseRace) {
    return <EmptyMeeting variant="no-race" />;
  }

  const race = mergeLiveOdds(baseRace, liveOdds.odds);
  const oddsUpdate = getRaceOddsUpdate(race, liveOdds.odds);
  const favs = findFavouriteNos(race);
  const v19Banner =
    effectiveMode === "v19"
      ? payload.v19Banners[String(race.raceNo)] ?? null
      : null;

  const showV19Skip =
    effectiveMode === "v19" &&
    v19Banner !== null &&
    (v19Banner.gate.action === "skip" || v19Banner.recommend === null);
  const showV19Banner =
    effectiveMode === "v19" &&
    v19Banner !== null &&
    v19Banner.gate.action === "play" &&
    v19Banner.recommend !== null;

  const nameByNo = buildNameByNo(race.runners);
  const banker =
    showV19Banner && v19Banner
      ? buildBankerPlay(v19Banner.recommend?.qinBanker ?? [], nameByNo)
      : null;
  const box =
    showV19Banner && v19Banner
      ? buildBoxPlay(
          v19Banner.recommend?.qinT12 ?? null,
          v19Banner.recommend?.qinBanker ?? [],
          nameByNo,
        )
      : null;

  const bankerNo = banker?.banker.no ?? null;
  const legNos = new Set<string>();
  if (banker) banker.legs.forEach((l) => legNos.add(l.no));
  if (box) box.numbers.forEach((n) => legNos.add(n));
  if (bankerNo) legNos.delete(bankerNo);

  return (
    <div className="space-y-3">
      <RaceTabs
        tabs={payload.tabs}
        currentRaceNo={race.raceNo}
        onSelect={setRaceNo}
      />

      <CurrentRaceCard race={race} />

      {payload.authenticated && (
        <ControlBar
          modelMode={modelMode}
          onModelChange={setModelMode}
          v19Available={payload.v19Available}
          oddsLoading={liveOdds.loading}
          oddsError={liveOdds.error}
          oddsLastUpdate={oddsUpdate}
          oddsFetchedAt={liveOdds.updatedAt}
          onOddsRefresh={liveOdds.refresh}
        />
      )}

      {!payload.authenticated && <PredictionPaywall />}

      {showV19Banner && v19Banner && (
        <V19BannerCard banner={v19Banner} runners={race.runners} />
      )}

      {showV19Skip && v19Banner && (
        <RaceSkipCard banner={v19Banner} />
      )}

      <RunnerList
        runners={race.runners}
        bankerNo={bankerNo}
        legNos={legNos}
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
