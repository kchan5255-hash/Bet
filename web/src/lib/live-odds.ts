import type { OddsPayload } from "./types";

interface RunnerWithOdds {
  no: string;
  winOdds?: number | null;
  placeOdds?: number | null;
}

interface RaceWithOdds<T extends RunnerWithOdds = RunnerWithOdds> {
  raceNo: number;
  runners: T[];
}

export function mergeLiveOdds<T extends RunnerWithOdds, R extends RaceWithOdds<T>>(
  race: R,
  oddsPayload: OddsPayload | null,
): R {
  const raceOdds = oddsPayload?.races.find((item) => item.raceNo === race.raceNo);
  if (!raceOdds) return race;

  return {
    ...race,
    runners: race.runners.map((runner) => {
      const odds = raceOdds.odds[String(runner.no)];
      if (!odds) return runner;
      return {
        ...runner,
        winOdds: odds.winOdds,
        placeOdds: odds.placeOdds,
      };
    }),
  } as R;
}

export function getRaceOddsUpdate(
  race: RaceWithOdds,
  oddsPayload: OddsPayload | null,
): string | null {
  return (
    oddsPayload?.races.find((item) => item.raceNo === race.raceNo)?.lastUpdate ??
    oddsPayload?.scrapedAt ??
    null
  );
}
