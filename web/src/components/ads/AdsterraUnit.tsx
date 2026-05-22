"use client";

import { useEffect, useRef } from "react";
import type { AdsterraConfig } from "./slots";

const NATIVE_CONTAINER_ID = "container-7133bd7ce73b0da55d872950552dc5ca";

interface Props {
  config: AdsterraConfig;
}

export function AdsterraUnit({ config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    if (!containerRef.current) return;
    if (!config.key) return;
    injected.current = true;

    if (config.format === "banner") {
      const container = containerRef.current;

      const optScript = document.createElement("script");
      optScript.type = "text/javascript";
      optScript.text = `var atOptions={'key':'${config.key}','format':'iframe','height':${config.height ?? 90},'width':${config.width ?? 728},'params':{}};`;
      container.appendChild(optScript);

      const invokeScript = document.createElement("script");
      invokeScript.type = "text/javascript";
      invokeScript.src = `//www.highperformanceformat.com/${config.key}/invoke.js`;
      container.appendChild(invokeScript);
    } else {
      // native: script goes to document body, renders into #container-xxx
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = config.key;
      document.body.appendChild(script);
    }
  }, [config]);

  if (config.format === "banner") {
    return (
      <div
        ref={containerRef}
        style={{
          width: config.width ?? 728,
          height: config.height ?? 90,
          maxWidth: "100%",
          margin: "0 auto",
        }}
      />
    );
  }

  // native: Adsterra renders into the div with the specific container id
  return (
    <div ref={containerRef} className="w-full">
      <div id={NATIVE_CONTAINER_ID} />
    </div>
  );
}
