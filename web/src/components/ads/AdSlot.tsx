"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/lib/subscription";
import { AdSenseUnit } from "./AdSenseUnit";
import { getAdConfig } from "./slots";

export type AdLayout =
  | "leaderboard"
  | "rectangle"
  | "in-feed"
  | "native-bento"
  | "sticky-mobile"
  | "mobile-banner";

const LAYOUT_HEIGHT: Record<AdLayout, string> = {
  leaderboard: "min-h-[100px] md:min-h-[110px]",
  rectangle: "min-h-[260px]",
  "in-feed": "min-h-[120px]",
  "native-bento": "min-h-[140px]",
  "sticky-mobile": "min-h-[60px]",
  "mobile-banner": "min-h-[110px]",
};

export interface AdSlotProps {
  slot: string;
  layout: AdLayout;
  label?: string;
  closable?: boolean;
  proHidden?: boolean;
  className?: string;
}

export function AdSlot({
  slot,
  layout,
  label = "贊助",
  closable = false,
  proHidden = true,
  className,
}: AdSlotProps) {
  const { isPro, ready: subReady } = useSubscription();
  const [closed, setClosed] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!closable) return;
    try {
      if (sessionStorage.getItem(closeKey(slot)) === "1") {
        setClosed(true);
      }
    } catch {
      // ignore
    }
  }, [closable, slot]);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const node = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  if (closed) return null;
  if (subReady && isPro && proHidden) return null;

  const isSticky = layout === "sticky-mobile";
  const isInFeed = layout === "in-feed";
  const isNativeBento = layout === "native-bento";

  return (
    <div
      ref={ref}
      data-ad-slot={slot}
      data-ad-layout={layout}
      role="complementary"
      aria-label="廣告"
      className={cn(
        "relative overflow-hidden",
        isInFeed
          ? "rounded-xl border-l-4 border-l-upset border border-border-subtle bg-bg-elevated"
          : isNativeBento
            ? "bento-card"
            : isSticky
              ? "md:hidden fixed inset-x-3 z-40 glass rounded-lg border border-border-subtle shadow-lg shadow-black/40"
              : "rounded-xl border border-border-subtle bg-bg-elevated",
        isSticky && "bottom-[calc(env(safe-area-inset-bottom)+72px)]",
        LAYOUT_HEIGHT[layout],
        className,
      )}
    >
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-wider text-text-subtle">
          {label}
        </span>
        {closable && (
          <button
            type="button"
            aria-label="關閉廣告"
            onClick={() => {
              setClosed(true);
              try {
                sessionStorage.setItem(closeKey(slot), "1");
              } catch {
                // ignore
              }
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-text-subtle hover:bg-bg-subtle hover:text-text"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className={cn("h-full w-full", isSticky ? "p-2 pr-12" : "p-3 pt-6")}>
        {visible ? (
          <AdContent slot={slot} layout={layout} />
        ) : (
          <AdSkeleton />
        )}
      </div>
    </div>
  );
}

function AdSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-bg-subtle">
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

function AdContent({ slot, layout }: { slot: string; layout: AdLayout }) {
  const config = getAdConfig(slot);

  if (config) {
    return <AdSenseUnit config={config} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border-subtle bg-bg-subtle/60 text-[11px] text-text-subtle">
      <div className="text-center leading-tight">
        <div className="number-mono font-bold text-text-muted">{slot}</div>
        <div className="text-[10px] uppercase tracking-wider">{layout}</div>
      </div>
    </div>
  );
}

function closeKey(slot: string) {
  return `furlong:ad-closed:${slot}`;
}
