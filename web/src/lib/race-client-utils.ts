interface RunnerLike {
  no: string;
  modelProbability: number;
  winOdds?: number | null;
  placeOdds?: number | null;
}

interface RaceLike<T extends RunnerLike = RunnerLike> {
  runners: T[];
}

export function sortRunnersByProb<T extends RunnerLike>(runners: T[]): T[] {
  return [...runners].sort((a, b) => b.modelProbability - a.modelProbability);
}

export function findFavouriteNos<T extends RunnerLike>(
  race: RaceLike<T>,
): { win?: string; place?: string } {
  let winBest: { no: string; value: number } | null = null;
  let placeBest: { no: string; value: number } | null = null;
  for (const runner of race.runners) {
    if (typeof runner.winOdds === "number" && Number.isFinite(runner.winOdds)) {
      if (!winBest || runner.winOdds < winBest.value) {
        winBest = { no: runner.no, value: runner.winOdds };
      }
    }
    if (typeof runner.placeOdds === "number" && Number.isFinite(runner.placeOdds)) {
      if (!placeBest || runner.placeOdds < placeBest.value) {
        placeBest = { no: runner.no, value: runner.placeOdds };
      }
    }
  }
  return { win: winBest?.no, place: placeBest?.no };
}
