import { NextResponse, type NextRequest } from "next/server";
import {
  applySecurityHeaders,
  logSecurityEvent,
  markHoneypotResponse,
} from "@/lib/security/traffic-control";

export async function GET(request: NextRequest) {
  logSecurityEvent(
    "trap-endpoint",
    request,
    `source=${request.nextUrl.searchParams.get("source") ?? "unknown"}`,
  );

  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });

  return applySecurityHeaders(markHoneypotResponse(response, request), request);
}
