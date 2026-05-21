import "server-only";

import { getRaces } from "./data";
import { applyProfessionalModel } from "./professional-model";
import { applyV9Model } from "./v9-model";
import { applyV19Model, getV19Entry, isV19Available } from "./v19-model";
import type { Race, Runner } from "./types";
import type {
  RaceCardMeta,
  RaceRunnerView,
  RaceView,
  RaceViewerPayload,
  V19BannerView,
} from "./race-view-types";

function toRunnerView(runner: Runner): RaceRunnerView {
  return {
    no: runner.no,
    name: runner.name,
    englishName: runner.englishName,
    code: runner.code,
    draw: runner.draw,
    handicapWeight: runner.handicapWeight,
    bodyWeight: runner.bodyWeight,
    rating: runner.rating,
    last6run: runner.last6run,
    jockey: runner.jockey,
    trainer: runner.trainer,
    age: runner.age,
    sex: runner.sex,
    rawScore: runner.rawScore,
    modelProbability: runner.modelProbability,
    winOdds: runner.winOdds ?? null,
    placeOdds: runner.placeOdds ?? null,
    gearInfo: runner.gearInfo,
    allowance: runner.allowance,
    trainerPreference: runner.trainerPreference,
    trumpCard: runner.trumpCard,
    priority: runner.priority,
  };
}

function toRaceView(race: Race): RaceView {
  return {
    raceNo: race.raceNo,
    raceName: race.raceName,
    distance: race.distance,
    className: race.className,
    going: race.going,
    course: race.course,
    postTime: race.postTime,
    runners: race.runners.map(toRunnerView),
  };
}

function toRaceCardMeta(race: Race): RaceCardMeta {
  return {
    raceNo: race.raceNo,
    raceName: race.raceName,
    distance: race.distance,
    className: race.className,
    going: race.going,
    course: race.course,
    postTime: race.postTime,
  };
}

function toV19BannerView(date: string, raceNo: number): V19BannerView | null {
  const entry = getV19Entry(date, raceNo);
  if (!entry) return null;

  return {
    fieldSize: entry.fieldSize,
    gate: {
      action: entry.gate.action,
      tier: entry.gate.tier,
      reason: entry.gate.reason,
      reasons: entry.gate.reasons,
      draw: entry.gate.draw,
      class: entry.gate.class,
      boost: entry.gate.boost,
    },
    recommend: entry.recommend
      ? {
          tier: entry.recommend.tier,
          qinT12: entry.recommend.qinT12,
          qinBanker: entry.recommend.qinBanker,
          stakeMul: entry.recommend.stakeMul,
          boost: entry.recommend.boost,
          commentary: entry.recommend.commentary ?? null,
        }
      : null,
  };
}

export function getRaceViewerPayload(date: string): RaceViewerPayload {
  const baseRaces = getRaces(date);
  const v19Available = isV19Available(date);

  return {
    date,
    cards: baseRaces.map(toRaceCardMeta),
    models: {
      pro: baseRaces.map((race) => toRaceView(applyProfessionalModel(race))),
      v9: baseRaces.map((race) => toRaceView(applyV9Model(race, date))),
      ...(v19Available
        ? {
            v19: baseRaces.map((race) => toRaceView(applyV19Model(race, date))),
          }
        : {}),
    },
    v19Available,
    v19Banners: Object.fromEntries(
      baseRaces.map((race) => [String(race.raceNo), toV19BannerView(date, race.raceNo)]),
    ),
  };
}
