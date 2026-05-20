import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { spawn } from "child_process";
import path from "path";

const BET_ROOT = path.resolve(process.cwd(), "..");
console.log("[admin] BET_ROOT =", BET_ROOT);

const FLOW_SCRIPTS: Record<
  string,
  (date: string, venue: string, races: string) => { cmd: string; args: string[]; env?: Record<string, string> }[]
> = {
  prediction: (date) => [
    { cmd: "build-analysis-from-graphql.js", args: [] },
    { cmd: "model-v19.js", args: [date] },
    { cmd: "export-v19-to-web.js", args: [date] },
  ],
  results: (date, venue, races) => [
    { cmd: "results-full-scraper.js", args: [], env: { DATE: date, VENUE: venue, RACES: races } },
    { cmd: "dividends-scraper.js", args: [], env: { DATE: date, VENUE: venue, RACES: races } },
    { cmd: "build-race-results-by-date.js", args: [] },
    { cmd: "build-dividends-by-date.js", args: [] },
  ],
  history: (date) => [
    { cmd: "model-v19.js", args: [date] },
    { cmd: "export-v19-to-web.js", args: [date] },
  ],
};

const FLOW_LABELS: Record<string, string[]> = {
  prediction: [
    "[1/3] 建立 analysis-by-date.json",
    "[2/3] 執行 V19 模型",
    "[3/3] 匯出 v19.json 至前端",
  ],
  results: [
    "[1/4] 爬取賽果",
    "[2/4] 爬取派彩",
    "[3/4] 聚合賽果 → race-results-by-date.json",
    "[4/4] 聚合派彩 → dividends-by-date.json",
  ],
  history: [
    "[1/2] 執行 V19 模型（含賽果）",
    "[2/2] 匯出 v19.json（全期）",
  ],
};

function checkSecret(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

function encodeSSE(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { flow, date, venue = "ST", races = "10" } = body as {
    flow?: string;
    date?: string;
    venue?: string;
    races?: string;
  };

  if (!flow || !FLOW_SCRIPTS[flow]) {
    return NextResponse.json({ error: "Invalid flow" }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const steps = FLOW_SCRIPTS[flow](date, venue, String(races));
  const labels = FLOW_LABELS[flow];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encodeSSE(msg));

      send(`開始執行流程：${flow}  ${date} ${venue} ${races}場`);

      for (let i = 0; i < steps.length; i++) {
        const { cmd, args, env } = steps[i];
        const label = labels[i] ?? cmd;
        send(`${label}...`);

        const ok = await runScript(cmd, args, env ?? {}, send);
        if (!ok) {
          send(`✗ 失敗於 ${label}`);
          controller.close();
          return;
        }
        send(`✓ ${label} 完成`);
      }

      send(`完成！${date} ${venue} ${races}場`);
      if (flow === "history" || flow === "results" || flow === "prediction") {
        revalidatePath("/history");
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function runScript(
  cmd: string,
  args: string[],
  env: Record<string, string>,
  send: (msg: string) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("node", [cmd, ...args], {
      cwd: BET_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) send(`  ${line}`);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) send(`  [err] ${line}`);
    });

    child.on("close", (code) => resolve(code === 0));
  });
}
