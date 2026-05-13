import analysisResults from "@/data/analysis-results.json";
import type { AnalysisResults, Race, Runner } from "./types";

export function getRaces(): Race[] {
  return analysisResults as AnalysisResults;
}

export function getRace(raceNo: number): Race | undefined {
  return getRaces().find((r) => r.raceNo === raceNo);
}

export function getMeetingDate(): string {
  const first = getRaces()[0];
  if (!first) return "";
  return first.postTime.slice(0, 10);
}

export function formatMeetingDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

export function formatPostTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function sortRunnersByProb(runners: Runner[]): Runner[] {
  return [...runners].sort((a, b) => b.modelProbability - a.modelProbability);
}

export function sortRunnersByNo(runners: Runner[]): Runner[] {
  return [...runners].sort((a, b) => Number(a.no) - Number(b.no));
}

export function getTopFour(race: Race): Runner[] {
  return sortRunnersByProb(race.runners).slice(0, 4);
}

export function getDarkHorse(race: Race): Runner | null {
  const sorted = sortRunnersByProb(race.runners);
  const rest = sorted.slice(4);
  if (rest.length === 0) return null;

  const LONG_ODDS = 10;
  const withOdds = rest.filter(
    (r) => typeof r.winOdds === "number" && Number.isFinite(r.winOdds),
  );
  const longshots = withOdds.filter((r) => (r.winOdds as number) >= LONG_ODDS);
  const pool = longshots.length > 0 ? longshots : withOdds;

  if (pool.length > 0) {
    const scored = pool
      .map((r) => {
        const implied = 1 / (r.winOdds as number);
        const valueGap = r.modelProbability - implied;
        const vetPenalty = r.veterinary ? 0.05 : 0;
        return { runner: r, score: valueGap - vetPenalty };
      })
      .sort((a, b) => b.score - a.score);
    return scored[0]?.runner ?? null;
  }

  const scored = rest
    .map((r) => {
      const hasVet = Boolean(r.veterinary);
      const posScore = r.positives.length * 2;
      const negScore = r.negatives.length;
      const keyBonus =
        (r.positives.includes("draw-edge") ? 1 : 0) +
        (r.positives.includes("recent-form") ? 1 : 0) +
        (r.positives.includes("course-distance") ? 1 : 0) +
        (r.positives.includes("light-weight") ? 0.5 : 0);
      const vetPenalty = hasVet ? 3 : 0;
      return {
        runner: r,
        score: posScore - negScore + keyBonus - vetPenalty + r.modelProbability * 0.1,
      };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.runner ?? null;
}

export function parseLast6(last6run: string): number[] {
  return last6run
    .split("/")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

export function findFavouriteNos(
  race: Race,
): { win?: string; place?: string } {
  let winBest: { no: string; value: number } | null = null;
  let placeBest: { no: string; value: number } | null = null;
  for (const r of race.runners) {
    if (typeof r.winOdds === "number" && Number.isFinite(r.winOdds)) {
      if (!winBest || r.winOdds < winBest.value) {
        winBest = { no: r.no, value: r.winOdds };
      }
    }
    if (typeof r.placeOdds === "number" && Number.isFinite(r.placeOdds)) {
      if (!placeBest || r.placeOdds < placeBest.value) {
        placeBest = { no: r.no, value: r.placeOdds };
      }
    }
  }
  return { win: winBest?.no, place: placeBest?.no };
}
