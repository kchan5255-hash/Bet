"use client";

import { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  Play,
  TrendingUp,
} from "lucide-react";
import {
  buildVideoUrl,
  videoLabel,
  type VideoKind,
} from "@/lib/results";
import { cn } from "@/lib/utils";

const VIEW_TABS: VideoKind[] = ["replay", "passthrough"];

const VIEW_TAB_ICONS: Record<VideoKind, React.ComponentType<{ className?: string }>> = {
  replay: Play,
  patrol: Play,
  frontrunner: Play,
  aerial: Play,
  passthrough: TrendingUp,
};

export interface VideoTarget {
  raceNo: number;
  raceTitle: string;
  date: string;
  venue: string;
  initialKind: VideoKind;
}

interface VideoPlayerDialogProps {
  target: VideoTarget | null;
  onClose: () => void;
}

export function VideoPlayerDialog({ target, onClose }: VideoPlayerDialogProps) {
  const [kind, setKind] = useState<VideoKind>("patrol");
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => {
    if (!target) return;
    setKind(target.initialKind);
    setIframeFailed(false);
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
  }, [target, onClose]);

  if (!target) return null;

  const src = buildVideoUrl(kind, target.date, target.venue, target.raceNo);
  const fullUrl = src;

  const tabs: VideoKind[] = VIEW_TABS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`第 ${target.raceNo} 場 全方位賽事重溫`}
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 bg-bg/85 backdrop-blur-sm animate-fade-in"
      />
      <div
        className={cn(
          "relative z-10 w-full md:max-w-3xl flex flex-col",
          "h-[100dvh] md:h-auto md:max-h-[88vh]",
          "md:rounded-2xl border border-border-subtle bg-bg-elevated",
          "shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.6)] md:shadow-2xl",
          "animate-fade-in",
        )}
      >
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-precision/40 bg-precision/10 text-precision number-mono text-sm font-bold shrink-0">
            {target.raceNo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold truncate">{target.raceTitle}</div>
            <div className="text-[10px] text-text-subtle truncate">
              全方位賽事重溫 · {videoLabel(kind)}
            </div>
          </div>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex h-8 items-center gap-1 rounded-md border border-border-subtle bg-bg-subtle px-2 text-[11px] text-text-muted hover:text-text transition"
            title="於馬會官網開啟"
          >
            官網開啟
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted hover:text-text transition"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-px bg-border-subtle border-b border-border-subtle">
          {tabs.map((k) => {
            const Icon = VIEW_TAB_ICONS[k];
            const active = k === kind;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setIframeFailed(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 transition",
                  active
                    ? "bg-bg-elevated text-precision"
                    : "bg-bg-subtle text-text-muted hover:text-text",
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", active && "stroke-[2.5]")}
                />
                <span className="text-[10px] leading-tight">
                  {videoLabel(k)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 bg-black min-h-[220px] md:aspect-video md:min-h-0">
          {iframeFailed ? (
            <FallbackPanel src={src} />
          ) : (
            <iframe
              key={src}
              src={src}
              title={`${target.raceTitle} - ${videoLabel(kind)}`}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onError={() => setIframeFailed(true)}
            />
          )}
        </div>

        <footer className="px-4 py-2 border-t border-border-subtle text-[10px] text-text-subtle leading-relaxed">
          影片由香港賽馬會提供。如未能即時播放,可
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-precision hover:text-precision-glow ml-1"
          >
            於新分頁開啟
          </a>
          。
        </footer>
      </div>
    </div>
  );
}

function FallbackPanel({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center">
      <p className="text-sm text-text-muted">
        馬會頁面無法在內嵌框架顯示。
      </p>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg ai-gradient px-4 py-2 text-sm font-semibold shadow-lg"
      >
        於新分頁播放
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
