"use client";

import { useEffect, useRef, useState } from "react";
import type { AdsterraConfig } from "./slots";

const NATIVE_CONTAINER_ID = "container-7133bd7ce73b0da55d872950552dc5ca";
const MOBILE_BREAKPOINT = 768;

interface Props {
  config: AdsterraConfig;
}

interface ResolvedBanner {
  key: string;
  width: number;
  height: number;
}

function resolveBanner(config: AdsterraConfig): ResolvedBanner {
  const isMobile =
    typeof window !== "undefined" &&
    window.innerWidth > 0 &&
    window.innerWidth < MOBILE_BREAKPOINT;
  if (isMobile && config.mobile?.key) {
    return {
      key: config.mobile.key,
      width: config.mobile.width,
      height: config.mobile.height,
    };
  }
  return {
    key: config.key,
    width: config.width ?? 728,
    height: config.height ?? 90,
  };
}

function buildBannerHtml(b: ResolvedBanner): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body><script type="text/javascript">var atOptions={"key":"${b.key}","format":"iframe","height":${b.height},"width":${b.width},"params":{}};<\/script><script type="text/javascript" src="//www.highperformanceformat.com/${b.key}/invoke.js"><\/script></body></html>`;
}

export function AdsterraUnit({ config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] = useState<ResolvedBanner | null>(null);

  useEffect(() => {
    setMounted(true);
    if (config.format === "banner") {
      setBanner(resolveBanner(config));
    }
  }, [config]);

  useEffect(() => {
    if (!mounted) return;
    if (injected.current) return;
    if (!containerRef.current) return;
    if (!config.key) return;
    injected.current = true;

    const container = containerRef.current;

    if (config.format === "banner") {
      if (!banner) return;
      const iframe = document.createElement("iframe");
      iframe.style.border = "0";
      iframe.style.width = `${banner.width}px`;
      iframe.style.height = `${banner.height}px`;
      iframe.style.display = "block";
      iframe.style.margin = "0 auto";
      iframe.style.transformOrigin = "top center";
      iframe.scrolling = "no";
      iframe.setAttribute("aria-hidden", "true");
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      // 精準 sandbox：
      // - allow-scripts: invoke.js 能跑
      // - allow-popups + allow-popups-to-escape-sandbox: 用戶點廣告開新分頁
      // - allow-top-navigation-by-user-activation: 只在用戶點擊時才能跳轉父頁
      //   → 自動跳轉（無 user activation）會被瀏覽器層級擋下
      // 不加 allow-same-origin: iframe 是 null origin，廣告 script 無法存取主頁
      iframe.setAttribute(
        "sandbox",
        [
          "allow-scripts",
          "allow-popups",
          "allow-popups-to-escape-sandbox",
          "allow-top-navigation-by-user-activation",
        ].join(" "),
      );
      iframe.srcdoc = buildBannerHtml(banner);
      container.appendChild(iframe);

      // 監聽 container 寬度，動態 scale iframe
      const applyScale = () => {
        const cw = container.clientWidth;
        if (cw <= 0) return;
        const scale = Math.min(1, cw / banner.width);
        iframe.style.transform = `scale(${scale})`;
        container.style.height = `${banner.height * scale}px`;
      };
      applyScale();
      const ro = new ResizeObserver(applyScale);
      ro.observe(container);
    } else {
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = config.key;
      container.appendChild(script);
    }
  }, [mounted, config, banner]);

  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (config.format === "banner") {
    if (!banner) return <div suppressHydrationWarning />;
    return (
      <div
        ref={containerRef}
        suppressHydrationWarning
        style={{
          width: "100%",
          maxWidth: banner.width,
          height: banner.height,
          margin: "0 auto",
          overflow: "hidden",
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
