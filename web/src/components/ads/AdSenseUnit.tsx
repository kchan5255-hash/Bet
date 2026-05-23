"use client";

import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, type AdSenseConfig } from "./slots";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseUnitProps {
  config: AdSenseConfig;
  onUnfilled?: () => void;
}

export function AdSenseUnit({ config, onUnfilled }: AdSenseUnitProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    if (!insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.warn("[AdSense] push failed", err);
    }

    // 監看 data-ad-status — AdSense 載完會設 "filled" 或 "unfilled"
    // unfilled 時通知父層隱藏容器，避免顯示一大塊空白
    const node = insRef.current;
    const obs = new MutationObserver(() => {
      const status = node.getAttribute("data-ad-status");
      if (status === "unfilled") {
        setUnfilled(true);
        onUnfilled?.();
      } else if (status === "filled") {
        setUnfilled(false);
      }
    });
    obs.observe(node, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => obs.disconnect();
  }, [onUnfilled]);

  return (
    <ins
      ref={insRef}
      className="adsbygoogle block h-full w-full"
      style={{ display: unfilled ? "none" : "block" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={config.adSenseSlot}
      data-ad-format={config.format}
      data-ad-layout-key={config.layoutKey || undefined}
      data-full-width-responsive={
        config.fullWidthResponsive ? "true" : undefined
      }
    />
  );
}
