import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL ?? "https://bet-teal-ten.vercel.app";

const PRIVATE_PATHS = [
  "/account",
  "/admin",
  "/api/",
  "/auth/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "GoogleOther",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "Diffbot",
  "Omgili",
  "ImagesiftBot",
  "YouBot",
  "cohere-ai",
  "Timpibot",
  "ICC-Crawler",
  "ai2bot",
  "SemrushBot",
  "AhrefsBot",
  "MJ12bot",
  "DotBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
      {
        userAgent: "AdsBot-Google",
        allow: "/",
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
