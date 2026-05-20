import type { MetadataRoute } from "next";

const HIGH_VALUE_PATHS = [
  "/races",
  "/results",
  "/history",
  "/auth/",
  "/account",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/api/",
];

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "PerplexityBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: HIGH_VALUE_PATHS,
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
  };
}
