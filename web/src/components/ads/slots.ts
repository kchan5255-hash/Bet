// AdSense
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export type AdFormat = "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";

export interface AdSenseConfig {
  adSenseSlot: string;
  format: AdFormat;
  layoutKey?: string;
  fullWidthResponsive?: boolean;
}

// Adsterra
export interface AdsterraConfig {
  provider: "adsterra";
  format: "banner" | "native";
  // banner: atOptions key (e.g. "abc123def456")
  // native: full invoke.js src URL
  key: string;
  width?: number;
  height?: number;
  // 手機版 banner 替換尺寸（< 768px 時使用）
  mobile?: {
    key: string;
    width: number;
    height: number;
  };
}

export type AnyAdConfig = AdSenseConfig | AdsterraConfig;

// ── AdSense slots ──────────────────────────────────────────────────────────
const AD_SLOTS: Record<string, AdSenseConfig> = {
  "home-hero-leaderboard": {
    adSenseSlot: "6656749168",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "home-bento-native": {
    adSenseSlot: "3895917514",
    format: "fluid",
    layoutKey: "-6t+ed+2i-1n-4w",
  },
  "races-list-banner": {
    adSenseSlot: "2188084172",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "results-list-banner": {
    adSenseSlot: "7248839167",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "results-feed-mid": {
    adSenseSlot: "7643590833",
    format: "fluid",
    layoutKey: "-ef+6k-30-ac+ty",
  },
  "history-list-banner": {
    adSenseSlot: "2188084172",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "history-feed-mid": {
    adSenseSlot: "7643590833",
    format: "fluid",
    layoutKey: "-ef+6k-30-ac+ty",
  },
  "result-detail-rectangle": {
    adSenseSlot: "1919427800",
    format: "rectangle",
    fullWidthResponsive: true,
  },
  "mobile-sticky-bottom": {
    adSenseSlot: "1718826251",
    format: "auto",
    fullWidthResponsive: true,
  },
  "side-rail-left": {
    adSenseSlot: "1718826251",
    format: "vertical",
  },
  "side-rail-right": {
    adSenseSlot: "1718826251",
    format: "vertical",
  },
};

// ── Adsterra slots ─────────────────────────────────────────────────────────
// 填入從 Adsterra Dashboard → Ad Units 取得的 key / src
const AT_728x90 = process.env.NEXT_PUBLIC_ADSTERRA_728x90 ?? "";
const AT_320x50 = process.env.NEXT_PUBLIC_ADSTERRA_320x50 ?? "";
const AT_160x600 = process.env.NEXT_PUBLIC_ADSTERRA_160x600 ?? "";
const AT_300x250 = process.env.NEXT_PUBLIC_ADSTERRA_300x250 ?? "";
const AT_NATIVE = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SRC ?? "";

const ADSTERRA_SLOTS: Record<string, AdsterraConfig> = {
  "home-hero-leaderboard": {
    provider: "adsterra", format: "banner",
    key: AT_728x90, width: 728, height: 90,
    mobile: { key: AT_320x50, width: 320, height: 50 },
  },
  "races-list-banner": {
    provider: "adsterra", format: "banner",
    key: AT_728x90, width: 728, height: 90,
    mobile: { key: AT_320x50, width: 320, height: 50 },
  },
  "results-list-banner": {
    provider: "adsterra", format: "banner",
    key: AT_728x90, width: 728, height: 90,
    mobile: { key: AT_320x50, width: 320, height: 50 },
  },
  "history-list-banner": {
    provider: "adsterra", format: "banner",
    key: AT_728x90, width: 728, height: 90,
    mobile: { key: AT_320x50, width: 320, height: 50 },
  },
  "result-detail-rectangle": {
    provider: "adsterra", format: "banner",
    key: AT_300x250, width: 300, height: 250,
    mobile: { key: AT_320x50, width: 320, height: 50 },
  },
  "mobile-sticky-bottom": {
    provider: "adsterra", format: "banner",
    key: AT_320x50, width: 320, height: 50,
  },
  "home-bento-native": {
    provider: "adsterra", format: "native", key: AT_NATIVE,
  },
  "results-feed-mid": {
    provider: "adsterra", format: "native", key: AT_NATIVE,
  },
  "history-feed-mid": {
    provider: "adsterra", format: "native", key: AT_NATIVE,
  },
  "side-rail-left": {
    provider: "adsterra", format: "banner",
    key: AT_160x600, width: 160, height: 600,
  },
  "side-rail-right": {
    provider: "adsterra", format: "banner",
    key: AT_160x600, width: 160, height: 600,
  },
};

// ── resolver ───────────────────────────────────────────────────────────────
export function getAdConfig(slot: string): AnyAdConfig | null {
  // AdSense 優先（已審批時啟用）
  if (ADSENSE_CLIENT) {
    const cfg = AD_SLOTS[slot];
    if (cfg?.adSenseSlot) return cfg;
  }
  // Adsterra fallback
  const at = ADSTERRA_SLOTS[slot];
  if (at?.key) return at;
  return null;
}

export function isAdsterra(cfg: AnyAdConfig): cfg is AdsterraConfig {
  return "provider" in cfg && cfg.provider === "adsterra";
}
