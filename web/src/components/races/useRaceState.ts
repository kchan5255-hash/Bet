"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RaceModelKey } from "@/lib/race-view-types";

const VALID_MODEL: RaceModelKey[] = ["v19", "pro", "v9"];

interface UseRaceStateOptions {
  defaultRaceNo: number;
  v19Available: boolean;
  totalRaces: number;
}

export function useRaceState({
  defaultRaceNo,
  v19Available,
  totalRaces,
}: UseRaceStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialRace = clampRace(
    parseRaceNo(searchParams.get("race"), defaultRaceNo),
    totalRaces,
  );
  const initialModel = parseModel(searchParams.get("model"), v19Available);

  const [raceNo, setRaceNoState] = useState<number>(initialRace);
  const [modelMode, setModelModeState] = useState<RaceModelKey>(initialModel);

  useEffect(() => {
    const r = clampRace(
      parseRaceNo(searchParams.get("race"), defaultRaceNo),
      totalRaces,
    );
    const m = parseModel(searchParams.get("model"), v19Available);
    setRaceNoState((prev) => (prev === r ? prev : r));
    setModelModeState((prev) => (prev === m ? prev : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const writeQuery = useCallback(
    (patch: Partial<{ race: number; model: RaceModelKey }>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (patch.race !== undefined) params.set("race", String(patch.race));
      if (patch.model !== undefined) {
        if (patch.model === "v19") params.delete("model");
        else params.set("model", patch.model);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setRaceNo = useCallback(
    (value: number) => {
      setRaceNoState(value);
      writeQuery({ race: value });
    },
    [writeQuery],
  );

  const setModelMode = useCallback(
    (value: RaceModelKey) => {
      setModelModeState(value);
      writeQuery({ model: value });
    },
    [writeQuery],
  );

  return {
    raceNo,
    modelMode,
    setRaceNo,
    setModelMode,
  };
}

function parseRaceNo(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampRace(value: number, total: number): number {
  if (total <= 0) return value;
  if (value < 1) return 1;
  if (value > total) return total;
  return value;
}

function parseModel(raw: string | null, v19Available: boolean): RaceModelKey {
  if (raw && (VALID_MODEL as string[]).includes(raw)) {
    const m = raw as RaceModelKey;
    if (m === "v19" && !v19Available) return "pro";
    return m;
  }
  return v19Available ? "v19" : "pro";
}
