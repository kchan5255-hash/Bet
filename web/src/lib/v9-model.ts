import "server-only";

import type { Race, Runner } from "./types";
import v9Data from "@/data/v9-results.json";

interface V9Runner {
  no: string;
  rank: number;
  rawScore: number;
  modelProbability: number;
  reliability: number;
  groups: Record<string, number>;
  topFactors: { factor: string; impact: number }[];
}

interface V9Race {
  raceNo: number;
  v9Temp: number;
  v9Top4: string[];
  signals: Record<string, unknown>;
  runners: V9Runner[];
}

interface V9DayEntry {
  date: string;
  venue: string;
  model: string;
  races: V9Race[];
}

interface V9Data {
  dates: string[];
  byDate: Record<string, V9DayEntry>;
  generatedAt: string;
}

const FEATURE_KEYS = [
  "recent",
  "form",
  "courseDistance",
  "course",
  "distance",
  "class",
  "going",
  "rating",
  "draw",
  "weight",
  "freshness",
  "body",
  "career",
  "age",
] as const;

type FeatureKey = (typeof FEATURE_KEYS)[number];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function percentileRank(value: number, values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (!finite.length || !Number.isFinite(value)) return 0.5;
  const lower = finite.filter((item) => item < value).length;
  const equal = finite.filter((item) => item === value).length;
  return (lower + 0.5 * equal) / finite.length;
}

function stdev(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  const mean = finite.reduce((sum, v) => sum + v, 0) / finite.length;
  const variance =
    finite.reduce((sum, v) => sum + (v - mean) ** 2, 0) / finite.length;
  return Math.sqrt(variance);
}

function dataReliability(runner: Runner): number {
  const records = Math.max(0, runner.recordsCount || 0);
  const historyReliability = records / (records + 6);
  const courseDistanceFit = clamp01(runner.features.courseDistance);
  return clamp(
    0.24 + 0.5 * historyReliability + 0.26 * courseDistanceFit,
    0.2,
    0.92,
  );
}

function raceClassNo(className: string): number | "GRIFFIN" {
  if (/新馬|Griffin/i.test(className)) return "GRIFFIN";
  const match = className.match(/(\d+)/);
  return match ? Number(match[1]) : 5;
}

function buildRelative(runners: Runner[]): Record<FeatureKey, number>[] {
  const byKey = Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, runners.map((r) => r.features[key])]),
  ) as Record<FeatureKey, number[]>;

  return runners.map((runner) => {
    const relative = {} as Record<FeatureKey, number>;
    for (const key of FEATURE_KEYS) {
      relative[key] = percentileRank(runner.features[key], byKey[key]);
    }
    return relative;
  });
}

function fallbackScore(
  relative: Record<FeatureKey, number>,
  reliability: number,
  race: Race,
) {
  const classNo = raceClassNo(race.className);

  const groups = {
    formCycle: 0.55 * relative.recent + 0.45 * relative.form,
    provenAbility:
      0.42 * relative.career + 0.38 * relative.rating + 0.20 * relative.age,
    suitability:
      0.30 * relative.courseDistance +
      0.20 * relative.course +
      0.22 * relative.distance +
      0.16 * relative.class +
      0.12 * relative.going,
    raceShape:
      0.40 * relative.draw +
      0.22 * relative.freshness +
      0.20 * relative.body +
      0.18 * relative.weight,
  };

  let weights = { formCycle: 0.30, provenAbility: 0.30, suitability: 0.24, raceShape: 0.16 };
  if (classNo === "GRIFFIN") {
    weights = { formCycle: 0.15, provenAbility: 0.20, suitability: 0.20, raceShape: 0.45 };
  } else if (race.distance <= 1200) {
    weights = { formCycle: 0.28, provenAbility: 0.27, suitability: 0.22, raceShape: 0.23 };
  }

  const raw =
    weights.formCycle * groups.formCycle +
    weights.provenAbility * groups.provenAbility +
    weights.suitability * groups.suitability +
    weights.raceShape * groups.raceShape;

  const reliabilityPenalty = (1 - reliability) * 0.040;
  const specialistBoost = Math.max(0, groups.suitability - 0.62) * 0.025;
  const shapeBoost = Math.max(0, groups.raceShape - 0.68) * 0.018;
  return clamp01(raw - reliabilityPenalty + specialistBoost + shapeBoost);
}

function softmaxProb(scores: number[], temperature: number): number[] {
  const max = Math.max(...scores);
  const exponentials = scores.map((s) => Math.exp((s - max) * temperature));
  const total = exponentials.reduce((sum, v) => sum + v, 0);
  return exponentials.map((v) => (v / total) * 100);
}

function adaptiveTemperature(
  scores: number[],
  fieldSize: number,
  meanReliability: number,
): number {
  const spread = stdev(scores);
  const fieldBase = fieldSize <= 9 ? 4.8 : 5.45;
  const spreadMultiplier = clamp(spread / 0.18, 0.82, 1.28);
  const reliabilityMultiplier = clamp(meanReliability / 0.58, 0.86, 1.12);
  return fieldBase * spreadMultiplier * reliabilityMultiplier;
}

function detectPositives(
  relative: Record<FeatureKey, number>,
): string[] {
  const positives: string[] = [];
  if (relative.recent >= 0.75) positives.push("recent-form");
  if (relative.courseDistance >= 0.75) positives.push("course-distance");
  if (relative.rating >= 0.78) positives.push("rating-edge");
  if (relative.draw >= 0.78) positives.push("draw-edge");
  if (relative.weight >= 0.75) positives.push("light-weight");
  if (relative.freshness >= 0.8) positives.push("freshness");
  if (relative.body >= 0.78) positives.push("stable-body-weight");
  return Array.from(new Set(positives));
}

function detectNegatives(
  relative: Record<FeatureKey, number>,
  reliability: number,
  hasVet: boolean,
): string[] {
  const negatives: string[] = [];
  if (relative.recent <= 0.25) negatives.push("weak-recent-form");
  if (relative.courseDistance <= 0.25) negatives.push("unproven-course-distance");
  if (relative.rating <= 0.2) negatives.push("low-rating");
  if (relative.draw <= 0.22) negatives.push("wide-or-bad-draw");
  if (relative.weight <= 0.18) negatives.push("heavy-weight");
  if (hasVet) negatives.push("veterinary-record");
  if (reliability <= 0.32) negatives.push("low-reliability");
  return Array.from(new Set(negatives));
}

const v9 = v9Data as V9Data;
const v9ByDate = new Map<string, Map<number, Map<string, V9Runner>>>();
for (const date of v9.dates) {
  const day = v9.byDate[date];
  if (!day) continue;
  const byRace = new Map<number, Map<string, V9Runner>>();
  for (const race of day.races) {
    byRace.set(
      race.raceNo,
      new Map(race.runners.map((r) => [String(r.no), r])),
    );
  }
  v9ByDate.set(date, byRace);
}

export function applyV9Model(race: Race, date?: string): Race {
  if (date) {
    const byRace = v9ByDate.get(date);
    const precomputed = byRace?.get(race.raceNo);
    if (precomputed && precomputed.size > 0) {
      return applyPrecomputed(race, precomputed);
    }
  } else {
    for (const byRace of v9ByDate.values()) {
      const precomputed = byRace.get(race.raceNo);
      if (precomputed && precomputed.size > 0) {
        return applyPrecomputed(race, precomputed);
      }
    }
  }
  return applyFallback(race);
}

function applyPrecomputed(
  race: Race,
  byNo: Map<string, V9Runner>,
): Race {
  const relatives = buildRelative(race.runners);
  return {
    ...race,
    runners: race.runners.map((runner, idx) => {
      const v9r = byNo.get(String(runner.no));
      if (!v9r) {
        return {
          ...runner,
          rawScore: 0,
          modelProbability: 0,
          positives: [],
          negatives: ["v9-missing"],
        };
      }
      return {
        ...runner,
        rawScore: v9r.rawScore,
        modelProbability: v9r.modelProbability,
        positives: detectPositives(relatives[idx]),
        negatives: detectNegatives(
          relatives[idx],
          v9r.reliability,
          Boolean(runner.veterinary),
        ),
      };
    }),
  };
}

function applyFallback(race: Race): Race {
  const runners = race.runners;
  if (!runners.length) return race;

  const relatives = buildRelative(runners);
  const reliabilities = runners.map(dataReliability);
  const meanReliability =
    reliabilities.reduce((sum, v) => sum + v, 0) / reliabilities.length;

  const finalScores = runners.map((_, idx) =>
    fallbackScore(relatives[idx], reliabilities[idx], race),
  );
  const temperature = adaptiveTemperature(
    finalScores,
    runners.length,
    meanReliability,
  );
  const probs = softmaxProb(finalScores, temperature);

  return {
    ...race,
    runners: runners.map((runner, idx) => ({
      ...runner,
      rawScore: finalScores[idx],
      modelProbability: probs[idx],
      positives: detectPositives(relatives[idx]),
      negatives: detectNegatives(
        relatives[idx],
        reliabilities[idx],
        Boolean(runner.veterinary),
      ),
    })),
  };
}
