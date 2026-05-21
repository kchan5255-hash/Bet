import { type NextRequest, NextResponse } from "next/server";
import { dispatchWorkflow, findRecentRun } from "@/lib/github-api";

const VALID_FLOWS = new Set(["pre-prediction", "results", "post-prediction", "history-rebuild"]);

function checkSecret(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { flow, date, venue = "ST", races = "10" } = body as {
    flow?: string; date?: string; venue?: string; races?: string;
  };

  if (!flow || !VALID_FLOWS.has(flow)) {
    return NextResponse.json({ error: `Invalid flow: ${flow}` }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    await dispatchWorkflow({ flow, date, venue, races: String(races) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // workflow_dispatch 不直接回 run id，等 1.5 秒後查最近的 run
  await new Promise((r) => setTimeout(r, 1500));
  const recent = await findRecentRun(flow).catch(() => null);

  return NextResponse.json({
    ok: true,
    runUrl: recent?.html_url ?? `https://github.com/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/actions`,
    runId: recent?.id ?? null,
    dispatchedAt: new Date().toISOString(),
  });
}
