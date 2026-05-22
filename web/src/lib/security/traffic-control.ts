import { NextResponse, type NextRequest } from "next/server";

const HONEYPOT_COOKIE = "__furlong_trap";
const TRAFFIC_COOKIE = "__furlong_traffic";
const BOT_RE =
  /bot|crawler|spider|curl|wget|python-requests|aiohttp|scrapy|httpclient|node-fetch|go-http-client|headless/i;

type BucketState = {
  count: number;
  resetAt: number;
};

type SweepState = {
  seen: string[];
  resetAt: number;
};

type CookieTrafficState = {
  v: 1;
  buckets: Record<string, BucketState>;
  sweeps: Record<string, SweepState>;
};

function now(): number {
  return Date.now();
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function buildContentSecurityPolicy(): string {
  // 廣告網絡（AdSense / Adsterra）動態載入大量第三方域名，
  // 用 https: 通配讓廣告聯盟生態正常運作；其餘 directive 維持嚴格。
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https:",
    ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss://*.supabase.co",
    "frame-src 'self' https:",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.supabase.co",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}

function wantsNoIndex(pathname: string): boolean {
  return [
    "/races",
    "/results",
    "/history",
    "/auth",
    "/account",
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/api/trap",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isHighValuePath(pathname: string): boolean {
  return ["/races", "/results", "/history"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPath(pathname: string): boolean {
  return [
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/auth",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

function createEmptyTrafficState(): CookieTrafficState {
  return {
    v: 1,
    buckets: {},
    sweeps: {},
  };
}

function decodeTrafficState(value: string | undefined): CookieTrafficState {
  if (!value) return createEmptyTrafficState();

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<CookieTrafficState>;
    return {
      v: 1,
      buckets: parsed.buckets ?? {},
      sweeps: parsed.sweeps ?? {},
    };
  } catch {
    return createEmptyTrafficState();
  }
}

function encodeTrafficState(state: CookieTrafficState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function compactTrafficState(state: CookieTrafficState): CookieTrafficState {
  const current = now();
  const buckets = Object.fromEntries(
    Object.entries(state.buckets)
      .filter(([, bucket]) => bucket.resetAt > current)
      .sort((a, b) => b[1].resetAt - a[1].resetAt)
      .slice(0, 12),
  );

  const activeSweeps = Object.entries(state.sweeps)
    .map(([key, sweep]) => ({
      key,
      sweep: {
        resetAt: sweep.resetAt,
        seen: sweep.seen.slice(-24),
      },
    }))
    .filter(({ sweep }) => sweep.resetAt > current)
    .sort((a, b) => b.sweep.resetAt - a.sweep.resetAt)
    .slice(0, 6);
  const sweeps: Record<string, SweepState> = {};
  for (const { key, sweep } of activeSweeps) {
    sweeps[key] = sweep;
  }

  return {
    v: 1,
    buckets,
    sweeps,
  };
}

function getTrafficState(request: NextRequest): CookieTrafficState {
  return compactTrafficState(
    decodeTrafficState(request.cookies.get(TRAFFIC_COOKIE)?.value),
  );
}

function incrementBucket(
  state: CookieTrafficState,
  key: string,
  windowMs: number,
): number {
  const current = now();
  const existing = state.buckets[key];
  if (!existing || existing.resetAt <= current) {
    state.buckets[key] = { count: 1, resetAt: current + windowMs };
    return 1;
  }

  existing.count += 1;
  return existing.count;
}

function hashSignature(signature: string): string {
  let hash = 0;
  for (let index = 0; index < signature.length; index += 1) {
    hash = (hash * 31 + signature.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function noteSweep(
  state: CookieTrafficState,
  pathname: string,
  signature: string,
): number {
  const key = pathname;
  const current = now();
  const hashed = hashSignature(signature);
  const existing = state.sweeps[key];
  if (!existing || existing.resetAt <= current) {
    state.sweeps[key] = {
      seen: [hashed],
      resetAt: current + 120_000,
    };
    return 1;
  }

  if (!existing.seen.includes(hashed)) {
    existing.seen.push(hashed);
    existing.seen = existing.seen.slice(-24);
  }
  return existing.seen.length;
}

function logSecurityEvent(label: string, request: NextRequest, extra?: string): void {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const suffix = extra ? ` ${extra}` : "";
  console.warn(
    `[security] ${label} ip=${ip} path=${request.nextUrl.pathname} ua=${userAgent}${suffix}`,
  );
}

function getLimit(request: NextRequest, flagged: boolean, suspiciousUa: boolean) {
  const pathname = request.nextUrl.pathname;
  if (isAuthPath(pathname)) {
    return { limit: flagged || suspiciousUa ? 8 : 16, windowMs: 60_000 };
  }
  if (isHighValuePath(pathname)) {
    return { limit: flagged || suspiciousUa ? 40 : 90, windowMs: 60_000 };
  }
  return { limit: flagged || suspiciousUa ? 60 : 120, windowMs: 60_000 };
}

export function inspectTraffic(request: NextRequest): {
  blocked: boolean;
  retryAfter?: number;
  suspiciousUa: boolean;
  flagged: boolean;
  state: CookieTrafficState;
} {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";
  const suspiciousUa = isSuspiciousUserAgent(userAgent);
  const flagged = request.cookies.get(HONEYPOT_COOKIE)?.value === "1";
  const state = getTrafficState(request);
  const { limit, windowMs } = getLimit(request, flagged, suspiciousUa);
  const bucketKey = `${ip}:${request.method}:${request.nextUrl.pathname}`;
  const count = incrementBucket(state, bucketKey, windowMs);

  if (suspiciousUa && count === 1) {
    logSecurityEvent("suspicious-ua", request);
  }

  if (isHighValuePath(request.nextUrl.pathname)) {
    const signature = `${request.nextUrl.pathname}?${request.nextUrl.searchParams.toString()}`;
    const sweepSize = noteSweep(state, request.nextUrl.pathname, signature);
    if (sweepSize === 20) {
      logSecurityEvent("param-sweep", request, `unique=${sweepSize}`);
    }
  }

  if (count > limit) {
    logSecurityEvent("rate-limit", request, `count=${count} limit=${limit}`);
    return {
      blocked: true,
      retryAfter: Math.ceil(windowMs / 1000),
      suspiciousUa,
      flagged,
      state,
    };
  }

  return { blocked: false, suspiciousUa, flagged, state };
}

export function persistTrafficState(
  response: NextResponse,
  request: NextRequest,
  state: CookieTrafficState,
): NextResponse {
  const compacted = compactTrafficState(state);
  response.cookies.set(TRAFFIC_COOKIE, encodeTrafficState(compacted), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 2 * 60,
    path: "/",
  });
  return response;
}

export function buildRateLimitedResponse(
  request: NextRequest,
  retryAfter = 60,
  state?: CookieTrafficState,
) {
  const response = new NextResponse("Too many requests", {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": String(retryAfter),
    },
  });
  if (state) {
    persistTrafficState(response, request, state);
  }
  applySecurityHeaders(response, request);
  return response;
}

export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  );

  if (wantsNoIndex(request.nextUrl.pathname)) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet, noimageindex",
    );
  }

  return response;
}

export function markHoneypotResponse(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  response.cookies.set(HONEYPOT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 60 * 60,
    path: "/",
  });
  return response;
}

export { HONEYPOT_COOKIE, TRAFFIC_COOKIE, logSecurityEvent };
