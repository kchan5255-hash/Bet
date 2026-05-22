"use client";

import type { RaceModelKey } from "@/lib/race-view-types";
import { ModelToggle } from "./ModelToggle";
import { OddsRefreshChip } from "./OddsRefreshChip";

interface ControlBarProps {
  modelMode: RaceModelKey;
  onModelChange: (value: RaceModelKey) => void;
  v19Available: boolean;

  oddsLoading: boolean;
  oddsError: string | null;
  oddsLastUpdate: string | null;
  oddsFetchedAt: string | null;
  onOddsRefresh: () => void;
}

export function ControlBar(props: ControlBarProps) {
  return (
    <div className="bento-card grid grid-cols-1 gap-2 p-2 md:grid-cols-2 md:gap-3 md:p-2.5">
      <ModelToggle
        value={props.modelMode}
        onChange={props.onModelChange}
        v19Available={props.v19Available}
      />
      <OddsRefreshChip
        loading={props.oddsLoading}
        error={props.oddsError}
        lastUpdate={props.oddsLastUpdate}
        fetchedAt={props.oddsFetchedAt}
        onRefresh={props.onOddsRefresh}
      />
    </div>
  );
}
