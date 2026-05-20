import "server-only";

import type { Race, Runner } from "./types";

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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function numberValue(value: unknown): number {
  const parsed = Number(String(value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCareerStarts(value: string): number {
  const match = String(value || "").match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  return match ? Number(match[4]) : 0;
}

function mean(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  return finite.length
    ? finite.reduce((sum, value) => sum + value, 0) / finite.length
    : 0.5;
}

function shrink(
  value: number,
  baseline: number,
  sampleSize: number,
  priorStrength: number,
): number {
  const n = Math.max(0, Number(sampleSize) || 0);
  const k = Math.max(0, Number(priorStrength) || 0);
  if (n + k === 0) return clamp01(value);
  return clamp01((n * value + k * baseline) / (n + k));
}

function professionalRawScore(
  runner: Runner,
  baselines: Record<FeatureKey, number>,
): number {
  const features = runner.features;
  const recordsCount = numberValue(runner.recordsCount);
  const careerStarts = parseCareerStarts(runner.careerStats);
  const vetPenalty = runner.veterinary?.risk || 0;

  const adjusted = {
    recent: shrink(features.recent, baselines.recent, Math.min(recordsCount, 8), 4),
    form: clamp01(features.form),
    courseDistance: shrink(
      features.courseDistance,
      baselines.courseDistance,
      Math.min(recordsCount, 6),
      8,
    ),
    course: shrink(features.course, baselines.course, Math.min(recordsCount, 10), 8),
    distance: shrink(
      features.distance,
      baselines.distance,
      Math.min(recordsCount, 10),
      8,
    ),
    class: shrink(features.class, baselines.class, Math.min(recordsCount, 10), 10),
    going: shrink(features.going, baselines.going, Math.min(recordsCount, 10), 10),
    rating: clamp01(features.rating),
    draw: clamp01(features.draw),
    weight: clamp01(features.weight),
    freshness: clamp01(features.freshness),
    body: clamp01(features.body),
    career: shrink(
      features.career,
      baselines.career,
      Math.min(careerStarts || recordsCount, 30),
      18,
    ),
    age: clamp01(features.age),
  };

  const baseAbility =
    0.34 * adjusted.recent +
    0.22 * adjusted.form +
    0.23 * adjusted.rating +
    0.14 * adjusted.career +
    0.07 * adjusted.age;

  const suitability =
    0.34 * adjusted.courseDistance +
    0.17 * adjusted.course +
    0.18 * adjusted.distance +
    0.17 * adjusted.class +
    0.14 * adjusted.going;

  const raceSetup =
    0.58 * adjusted.draw +
    0.3 * adjusted.weight +
    0.12 * adjusted.freshness;

  const condition = 0.68 * adjusted.body + 0.32 * adjusted.freshness;

  return (
    0.4 * baseAbility +
    0.3 * suitability +
    0.2 * raceSetup +
    0.1 * condition -
    vetPenalty * 1.12
  );
}

export function applyProfessionalModel(race: Race): Race {
  const runners = race.runners || [];
  const baselines = Object.fromEntries(
    FEATURE_KEYS.map((key) => [
      key,
      mean(runners.map((runner) => runner.features?.[key] ?? 0.5)),
    ]),
  ) as Record<FeatureKey, number>;

  const rawScores = runners.map((runner) => professionalRawScore(runner, baselines));
  const temperature = runners.length <= 9 ? 4.2 : 4.6;
  const exponentials = rawScores.map((score) => Math.exp(temperature * score));
  const sum = exponentials.reduce((total, value) => total + value, 0);

  return {
    ...race,
    runners: runners.map((runner, index) => ({
      ...runner,
      rawScore: rawScores[index],
      modelProbability: (exponentials[index] / sum) * 100,
    })),
  };
}
