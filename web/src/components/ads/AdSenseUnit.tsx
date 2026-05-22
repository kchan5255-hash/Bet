"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, type AdSenseConfig } from "./slots";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseUnitProps {
  config: AdSenseConfig;
}

export function AdSenseUnit({ config }: AdSenseUnitProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    if (!insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.warn("[AdSense] push failed", err);
    }
  }, []);

  return (
    <ins
      ref={insRef}
      className="adsbygoogle block h-full w-full"
      style={{ display: "block" }}
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
