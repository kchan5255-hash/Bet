import { Calendar, Hourglass, AlertTriangle } from "lucide-react";

type Variant = "no-meeting" | "no-v19" | "no-race";

interface EmptyMeetingProps {
  variant: Variant;
}

const CONFIG: Record<
  Variant,
  { icon: typeof Calendar; title: string; desc: string }
> = {
  "no-meeting": {
    icon: Calendar,
    title: "本期暫無賽事",
    desc: "請選擇其他賽馬日，或留意公告。",
  },
  "no-v19": {
    icon: Hourglass,
    title: "V19 預測未到位",
    desc: "本場 V19 推介尚未生成，可先參考 Pro / V9 模型分析。",
  },
  "no-race": {
    icon: AlertTriangle,
    title: "本期無可用賽事",
    desc: "資料未齊全，請稍後再試。",
  },
};

export function EmptyMeeting({ variant }: EmptyMeetingProps) {
  const config = CONFIG[variant];
  const Icon = config.icon;
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-bg-elevated/40 px-4 py-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-text-subtle" aria-hidden />
      <div className="mt-3 text-sm font-bold text-text">{config.title}</div>
      <div className="mt-1 text-[12px] text-text-muted">{config.desc}</div>
    </div>
  );
}
