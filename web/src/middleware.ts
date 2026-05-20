import { NextResponse, type NextRequest } from "next/server";
import {
  applySecurityHeaders,
  buildRateLimitedResponse,
  inspectTraffic,
  logSecurityEvent,
  markHoneypotResponse,
  persistTrafficState,
} from "@/lib/security/traffic-control";
import { updateSession } from "@/lib/supabase/proxy";

function isHoneypotHit(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return pathname === "/api/trap" || request.nextUrl.searchParams.has("__trap");
}

function isAdminPath(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/api/admin/run" || pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest) {
  // Admin 路徑跳過 rate limit，由 API route 自行驗證 secret
  if (isAdminPath(request)) {
    const response = await updateSession(request);
    return applySecurityHeaders(response, request);
  }

  const traffic = inspectTraffic(request);
  if (traffic.blocked) {
    return buildRateLimitedResponse(request, traffic.retryAfter, traffic.state);
  }

  let response = await updateSession(request);

  if (isHoneypotHit(request)) {
    logSecurityEvent(
      "honeypot",
      request,
      `source=${request.nextUrl.searchParams.get("source") ?? "unknown"}`,
    );
    response = markHoneypotResponse(response, request);
  }

  response = persistTrafficState(response, request, traffic.state);
  return applySecurityHeaders(response, request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
