import { type NextRequest, NextResponse } from "next/server";
import { getRunStatus, listRecentRuns } from "@/lib/github-api";

function checkSecret(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = request.nextUrl.searchParams.get("runId");
  if (runId) {
    const status = await getRunStatus(Number(runId));
    if (!status) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    return NextResponse.json(status);
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") || "5");
  const runs = await listRecentRuns(limit);
  return NextResponse.json({ runs });
}
