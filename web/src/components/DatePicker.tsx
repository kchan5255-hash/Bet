"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DateMeta } from "@/lib/meeting-utils";
import { weekdayLabel } from "@/lib/meeting-utils";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selectedDate: string;
  meetingDates: DateMeta[];
  onChange: (date: string) => void;
}

export function DatePicker({
  selectedDate,
  meetingDates,
  onChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const meta = meetingDates.find((d) => d.date === selectedDate);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex flex-col items-center justify-center gap-0.5 py-3 px-4 rounded-xl border border-border-subtle bg-bg-elevated hover:border-border transition"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-precision" />
          <span className="number-mono text-base font-bold">
            {selectedDate}
          </span>
        </div>
        <div className="text-[10px] text-text-muted">
          {weekdayLabel(selectedDate)}「{meta?.venueName ?? ""}」
        </div>
      </button>

      {open && (
        <CalendarModal
          selectedDate={selectedDate}
          meetingDates={meetingDates}
          onClose={() => setOpen(false)}
          onSelect={(d) => {
            setOpen(false);
            if (d !== selectedDate) onChange(d);
          }}
        />
      )}
    </>
  );
}

interface CalendarModalProps {
  selectedDate: string;
  meetingDates: DateMeta[];
  onClose: () => void;
  onSelect: (date: string) => void;
}

function CalendarModal({
  selectedDate,
  meetingDates,
  onClose,
  onSelect,
}: CalendarModalProps) {
  const dateMap = useMemo(() => {
    const m = new Map<string, DateMeta>();
    for (const d of meetingDates) m.set(d.date, d);
    return m;
  }, [meetingDates]);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const d of meetingDates) set.add(d.date.slice(0, 7));
    return [...set].sort();
  }, [meetingDates]);

  const initialMonth =
    months.find((mm) => selectedDate.startsWith(mm)) ??
    months[months.length - 1];

  const [month, setMonth] = useState<string>(initialMonth);
  const idx = months.indexOf(month);
  const canPrev = idx > 0;
  const canNext = idx < months.length - 1;

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="選擇賽馬日"
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 bg-bg/85 backdrop-blur-sm animate-fade-in"
      />
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full md:max-w-md flex flex-col",
          "max-h-[90vh] md:max-h-[80vh]",
          "rounded-t-2xl md:rounded-2xl border border-border-subtle bg-bg-elevated",
          "shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.6)] md:shadow-2xl",
          "animate-fade-in",
        )}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => canPrev && setMonth(months[idx - 1])}
            aria-label="上個月"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-bold tracking-wider">
            {formatMonthLabel(month)}
          </h2>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => canNext && setMonth(months[idx + 1])}
            aria-label="下個月"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-4">
          <MonthGrid
            month={month}
            dateMap={dateMap}
            selectedDate={selectedDate}
            onSelect={onSelect}
          />
        </div>

        <footer className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle text-[10px] text-text-subtle">
          <Legend />
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-subtle bg-bg-subtle px-3 text-xs text-text-muted hover:text-text transition"
          >
            <X className="h-3.5 w-3.5" />
            關閉
          </button>
        </footer>
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  dateMap,
  selectedDate,
  onSelect,
}: {
  month: string;
  dateMap: Map<string, DateMeta>;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const [year, m] = month.split("-").map(Number);
  const firstDay = new Date(year, m - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, m, 0).getDate();

  const cells: ({ day: number; date: string } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1.5 text-[10px] text-text-subtle text-center">
        {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={`pad-${i}`} className="aspect-square" />;
          const meta = dateMap.get(c.date);
          const isMeeting = Boolean(meta);
          const isSelected = c.date === selectedDate;
          return (
            <button
              key={c.date}
              type="button"
              disabled={!isMeeting}
              onClick={() => isMeeting && onSelect(c.date)}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center transition relative",
                isSelected
                  ? "bg-precision text-bg font-bold"
                  : isMeeting
                    ? "border border-precision/40 bg-precision/10 text-precision hover:bg-precision/20"
                    : "text-text-subtle/40 cursor-not-allowed",
              )}
              aria-label={
                isMeeting
                  ? `選擇 ${c.date} ${meta?.venueName} 賽馬日`
                  : `${c.date} 無賽事`
              }
              aria-current={isSelected ? "date" : undefined}
            >
              <span className="number-mono text-sm">{c.day}</span>
              {isMeeting && !isSelected && (
                <span className="text-[8px] mt-0.5 leading-none">
                  {meta?.venue}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-sm border border-precision/60 bg-precision/15" />
        賽馬日
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-precision" />
        已選
      </span>
    </div>
  );
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y} 年 ${Number(m)} 月`;
}
