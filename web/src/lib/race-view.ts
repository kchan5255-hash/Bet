import "server-only";

import { getRaces, getMeetings } from "./data";
import { applyProfessionalModel } from "./professional-model";
import { applyV9Model } from "./v9-model";
import { applyV19Model, getV19Entry, isV19Available } from "./v19-model";
import type { Race, Runner } from "./types";
import type {
  RaceCardMeta,
  RaceRunnerView,
  RaceTabMeta,
  RaceTier,
  RaceTierSummary,
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

function stripModelOutput(runner: RaceRunnerView): RaceRunnerView {
  return {
    ...runner,
    rawScore: 0,
    modelProbability: 0,
    trainerPreference: undefined,
    trumpCard: false,
    priority: false,
  };
}

function stripRaceModelOutput(race: RaceView): RaceView {
  return {
    ...race,
    runners: race.runners.map(stripModelOutput),
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

export interface RaceViewerOptions {
  authenticated: boolean;
}

export function getRaceViewerPayload(
  date: string,
  options: RaceViewerOptions = { authenticated: false },
): RaceViewerPayload {
  const baseRaces = getRaces(date);
  const v19Available = isV19Available(date);
  const venue = getMeetings().find((m) => m.date === date)?.venue ?? "";

  const cards = baseRaces.map(toRaceCardMeta);

  if (!options.authenticated) {
    const proStripped = baseRaces.map((race) =>
      stripRaceModelOutput(toRaceView(applyProfessionalModel(race))),
    );
    const emptyBanners = Object.fromEntries(
      cards.map((c) => [String(c.raceNo), null] as const),
    );
    return {
      date,
      venue,
      authenticated: false,
      cards,
      models: {
        pro: proStripped,
        v9: proStripped,
      },
      v19Available: false,
      v19Banners: emptyBanners,
      tierSummary: buildTierSummary(emptyBanners),
      tabs: buildRaceTabs(cards, emptyBanners),
    };
  }

  const v19Banners = Object.fromEntries(
    baseRaces.map((race) => [String(race.raceNo), toV19BannerView(date, race.raceNo)]),
  );

  return {
    date,
    venue,
    authenticated: true,
    cards,
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
    v19Banners,
    tierSummary: buildTierSummary(v19Banners),
    tabs: buildRaceTabs(cards, v19Banners),
  };
}

function bannerTier(banner: V19BannerView | null): RaceTier | null {
  if (!banner) return null;
  if (banner.gate.action === "skip") return "skip";
  return banner.recommend?.tier ?? banner.gate.tier ?? null;
}

export function buildTierSummary(
  banners: Record<string, V19BannerView | null>,
): RaceTierSummary {
  const summary: RaceTierSummary = {
    S: 0,
    A: 0,
    B: 0,
    skip: 0,
    total: Object.keys(banners).length,
  };
  for (const banner of Object.values(banners)) {
    const tier = bannerTier(banner);
    if (tier) summary[tier] += 1;
  }
  return summary;
}

export function buildRaceTabs(
  cards: RaceCardMeta[],
  banners: Record<string, V19BannerView | null>,
  now: Date = new Date(),
): RaceTabMeta[] {
  return cards.map((card) => {
    const banner = banners[String(card.raceNo)] ?? null;
    const post = new Date(card.postTime);
    const isPast =
      !Number.isNaN(post.getTime()) && post.getTime() + 5 * 60_000 < now.getTime();
    return {
      ...card,
      tier: bannerTier(banner),
      isPast,
    };
  });
}
