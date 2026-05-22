"use client";

import { useEffect, useRef, useState } from "react";
import type { AdsterraConfig } from "./slots";

const NATIVE_CONTAINER_ID = "container-7133bd7ce73b0da55d872950552dc5ca";

interface Props {
  config: AdsterraConfig;
}

function buildBannerHtml(config: AdsterraConfig): string {
  const w = config.width ?? 728;
  const h = config.height ?? 90;
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body><script type="text/javascript">var atOptions={"key":"${config.key}","format":"iframe","height":${h},"width":${w},"params":{}};<\/script><script type="text/javascript" src="//www.highperformanceformat.com/${config.key}/invoke.js"><\/script></body></html>`;
}

export function AdsterraUnit({ config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (injected.current) return;
    if (!containerRef.current) return;
    if (!config.key) return;
    injected.current = true;

    const container = containerRef.current;

    if (config.format === "banner") {
      // 用 srcdoc iframe 隔離每個 banner，避免 atOptions 全局衝突
      const iframe = document.createElement("iframe");
      iframe.style.border = "0";
      iframe.style.width = `${config.width ?? 728}px`;
      iframe.style.height = `${config.height ?? 90}px`;
      iframe.style.maxWidth = "100%";
      iframe.style.display = "block";
      iframe.style.margin = "0 auto";
      iframe.scrolling = "no";
      iframe.setAttribute("aria-hidden", "true");
      iframe.srcdoc = buildBannerHtml(config);
      container.appendChild(iframe);
    } else {
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = config.key;
      container.appendChild(script);
    }
  }, [mounted, config]);

  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (config.format === "banner") {
    return (
      <div
        ref={containerRef}
        suppressHydrationWarning
        style={{
          width: config.width ?? 728,
          height: config.height ?? 90,
          maxWidth: "100%",
          margin: "0 auto",
        }}
      />
    );
  }

  return (
    <div ref={containerRef} className="w-full" suppressHydrationWarning>
      <div id={NATIVE_CONTAINER_ID} />
    </div>
  );
}
