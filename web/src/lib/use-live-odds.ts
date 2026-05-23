"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OddsPayload, RaceOdds, RunnerOdds } from "./types";
import { getSupabase } from "./supabase";

const FALLBACK_VENUE = process.env.NEXT_PUBLIC_VENUE || "HV";

interface OddsRow {
  date: string;
  venue: string;
  race_no: number;
  horse_no: number;
  win_odds: number | null;
  place_odds: number | null;
  updated_at: string;
}

interface MetaRow {
  date: string;
  venue: string;
  race_no: number;
  last_update: string | null;
  scraped_at: string;
}

type RaceMap = Map<number, RaceOdds>;

function raceMapToPayload(
  date: string,
  venue: string,
  scrapedAt: string | null,
  races: RaceMap,
): OddsPayload {
  return {
    date,
    venueCode: venue,
    scrapedAt: scrapedAt ?? new Date().toISOString(),
    races: [...races.values()].sort((a, b) => a.raceNo - b.raceNo),
  };
}

function applyOddsRow(races: RaceMap, row: OddsRow) {
  const existing = races.get(row.race_no) ?? {
    raceNo: row.race_no,
    odds: {} as Record<string, RunnerOdds>,
    lastUpdate: null,
  };
  const nextOdds: Record<string, RunnerOdds> = {
    ...existing.odds,
    [String(row.horse_no)]: {
      winOdds: row.win_odds,
      placeOdds: row.place_odds,
    },
  };
  races.set(row.race_no, { ...existing, odds: nextOdds });
}

function applyMetaRow(races: RaceMap, row: MetaRow) {
  const existing = races.get(row.race_no) ?? {
    raceNo: row.race_no,
    odds: {} as Record<string, RunnerOdds>,
    lastUpdate: null,
  };
  races.set(row.race_no, { ...existing, lastUpdate: row.last_update });
}

export function useLiveOdds(date: string, venueArg?: string) {
  const venue = venueArg && venueArg.length > 0 ? venueArg : FALLBACK_VENUE;
  const [odds, setOdds] = useState<OddsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const racesRef = useRef<RaceMap>(new Map());
  const scrapedAtRef = useRef<string | null>(null);

  const flush = useCallback(() => {
    setOdds(raceMapToPayload(date, venue, scrapedAtRef.current, racesRef.current));
    setUpdatedAt(new Date().toISOString());
  }, [date, venue]);

  const refresh = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const [oddsRes, metaRes] = await Promise.all([
        supabase
          .from("odds")
          .select("*")
          .eq("date", date)
          .eq("venue", venue),
        supabase
          .from("race_meta")
          .select("*")
          .eq("date", date)
          .eq("venue", venue),
      ]);

      if (oddsRes.error) throw oddsRes.error;
      if (metaRes.error) throw metaRes.error;

      const races: RaceMap = new Map();
      for (const row of (oddsRes.data ?? []) as OddsRow[]) applyOddsRow(races, row);
      for (const row of (metaRes.data ?? []) as MetaRow[]) applyMetaRow(races, row);

      let latest: string | null = null;
      for (const row of (metaRes.data ?? []) as MetaRow[]) {
        if (!latest || row.scraped_at > latest) latest = row.scraped_at;
      }

      racesRef.current = races;
      scrapedAtRef.current = latest;
      flush();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load odds");
    } finally {
      setLoading(false);
    }
  }, [date, venue, flush]);

  useEffect(() => {
    if (!date) return;
    refresh();

    const supabase = getSupabase();
    const filter = `date=eq.${date}`;
    const channel = supabase
      .channel(`live-odds-${date}-${venue}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "odds", filter },
        (payload) => {
          const row = (payload.new ?? payload.old) as OddsRow | undefined;
          if (!row || row.venue !== venue) return;
          applyOddsRow(racesRef.current, row);
          scrapedAtRef.current = new Date().toISOString();
          flush();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "race_meta", filter },
        (payload) => {
          const row = (payload.new ?? payload.old) as MetaRow | undefined;
          if (!row || row.venue !== venue) return;
          applyMetaRow(racesRef.current, row);
          scrapedAtRef.current = row.scraped_at ?? scrapedAtRef.current;
          flush();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, venue, refresh, flush]);

  return { odds, loading, error, updatedAt, refresh };
}
