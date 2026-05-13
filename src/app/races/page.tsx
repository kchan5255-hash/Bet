import { Calendar } from "lucide-react";
import { getRaces, getMeetingDate, formatMeetingDate } from "@/lib/data";
import { RaceViewer } from "@/components/RaceViewer";

export default function RacesPage() {
  const races = getRaces();
  const meetingDate = getMeetingDate();

  return (
    <div className="mx-auto max-w-5xl px-3 md:px-6 py-3 md:py-6">
      <header className="mb-3 md:mb-5">
        <div className="hidden md:flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          Current Meeting
        </div>
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            本期預測
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-text-muted">賽馬日</span>
            <span className="font-semibold">
              {formatMeetingDate(meetingDate)}
            </span>
            <span className="text-text-subtle">·</span>
            <span className="text-text-muted">跑馬地</span>
          </div>
        </div>

        <div className="md:hidden flex items-center justify-center gap-3 text-xs">
          <div className="text-center">
            <div className="font-bold">{meetingDate}</div>
            <div className="text-[10px] text-text-muted">週三「跑馬地」</div>
          </div>
        </div>
      </header>

      <RaceViewer races={races} />
    </div>
  );
}
