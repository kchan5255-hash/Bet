import type { OddsPayload, Race } from "./types";

export function mergeLiveOdds(race: Race, oddsPayload: OddsPayload | null): Race {
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
  };
}

export function getRaceOddsUpdate(
  race: Race,
  oddsPayload: OddsPayload | null,
): string | null {
  return (
    oddsPayload?.races.find((item) => item.raceNo === race.raceNo)?.lastUpdate ??
    oddsPayload?.scrapedAt ??
    null
  );
}
