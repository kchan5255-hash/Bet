"use client";

import { useEffect, useRef, useState } from "react";
import type { AdsterraConfig } from "./slots";

const NATIVE_CONTAINER_ID = "container-7133bd7ce73b0da55d872950552dc5ca";

interface Props {
  config: AdsterraConfig;
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
      const optScript = document.createElement("script");
      optScript.type = "text/javascript";
      optScript.text = `var atOptions={'key':'${config.key}','format':'iframe','height':${config.height ?? 90},'width':${config.width ?? 728},'params':{}};`;
      container.appendChild(optScript);

      const invokeScript = document.createElement("script");
      invokeScript.type = "text/javascript";
      invokeScript.src = `//www.highperformanceformat.com/${config.key}/invoke.js`;
      container.appendChild(invokeScript);
    } else {
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = config.key;
      container.appendChild(script);
    }
  }, [mounted, config]);

  // Server render 統一返回空 div，避免 hydration mismatch
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
