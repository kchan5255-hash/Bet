"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Runner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { JockeySilk } from "./JockeySilk";

interface RunnerDetailDialogProps {
  runner: Runner | null;
  onClose: () => void;
}

export function RunnerDetailDialog({ runner, onClose }: RunnerDetailDialogProps) {
  useEffect(() => {
    if (!runner) return;
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
  }, [runner, onClose]);

  if (!runner) return null;

  const rows = buildRows(runner);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${runner.no} ${runner.name} 詳細資料`}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm animate-fade-in"
      />
      <div
        className={cn(
          "relative z-10 w-full md:max-w-md max-h-[88vh] overflow-y-auto",
          "rounded-t-2xl md:rounded-2xl border border-border-subtle bg-bg-elevated",
          "shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.6)] md:shadow-2xl",
          "animate-fade-in",
        )}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-elevated/95 backdrop-blur">
          <JockeySilk no={runner.no} code={runner.code} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="number-mono text-base font-black text-text-muted">
                {runner.no}
              </span>
              <span className="text-base font-bold truncate">{runner.name}</span>
            </div>
            <div className="text-[10px] text-text-subtle truncate">
              {runner.englishName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted hover:text-text transition"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <dl className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[112px_1fr] items-center px-4 py-3 text-sm"
            >
              <dt className="text-text-muted text-xs">{row.label}</dt>
              <dd
                className={cn(
                  "font-medium",
                  row.mono && "number-mono tabular-nums",
                  row.muted && "text-text-subtle",
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

interface DetailRow {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
}

function buildRows(runner: Runner): DetailRow[] {
  const ageSex = formatAgeSex(runner.age, runner.sex);
  return [
    { label: "騎師", value: runner.jockey || EMPTY },
    { label: "練馬師", value: runner.trainer || EMPTY },
    { label: "檔位", value: runner.draw || EMPTY, mono: true },
    { label: "負磅", value: runner.handicapWeight || EMPTY, mono: true },
    { label: "馬匹體重", value: runner.bodyWeight || EMPTY, mono: true },
    {
      label: "6次近績",
      value: runner.last6run || EMPTY,
      mono: true,
    },
    { label: "評分", value: runner.rating || EMPTY, mono: true },
    {
      label: "年齡/性別",
      value: ageSex || EMPTY,
      muted: !ageSex,
    },
    {
      label: "配備",
      value: runner.gearInfo || EMPTY,
      mono: Boolean(runner.gearInfo),
      muted: !runner.gearInfo,
    },
    {
      label: "分齡讓磅",
      value: runner.allowance || EMPTY,
      muted: !runner.allowance,
    },
    {
      label: "王牌",
      value: runner.trumpCard ? <Star /> : EMPTY,
      muted: !runner.trumpCard,
    },
    {
      label: "優先出賽權",
      value: runner.priority ? <Star /> : EMPTY,
      muted: !runner.priority,
    },
    {
      label: "練馬師之馬匹優先參賽次序",
      value:
        typeof runner.trainerPreference === "number" && runner.trainerPreference > 0
          ? runner.trainerPreference
          : EMPTY,
      mono: true,
      muted:
        !runner.trainerPreference || runner.trainerPreference <= 0,
    },
  ];
}

const EMPTY = (
  <span className="text-text-subtle">--</span>
);

function Star() {
  return (
    <span className="text-warning" aria-label="是">
      ★
    </span>
  );
}

function formatAgeSex(age: string, sex?: string): string {
  const ageYears = (age.split("/").pop() || "").trim();
  const sexLabel = sexToLabel(sex);
  if (ageYears && sexLabel) return `${ageYears} / ${sexLabel}`;
  if (ageYears) return ageYears;
  if (sexLabel) return sexLabel;
  return "";
}

function sexToLabel(sex?: string): string {
  if (!sex) return "";
  const value = sex.trim().toLowerCase();
  const map: Record<string, string> = {
    g: "閹",
    gelding: "閹",
    h: "雄",
    horse: "雄",
    c: "雄",
    colt: "雄",
    s: "雄",
    stallion: "雄",
    m: "雌",
    mare: "雌",
    f: "雌",
    filly: "雌",
    r: "騸",
    rig: "騸",
  };
  return map[value] ?? sex;
}
