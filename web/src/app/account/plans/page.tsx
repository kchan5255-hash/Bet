import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { PlansClient } from "./PlansClient";

export default async function PlansPage() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-8">
      <div className="mb-6">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs md:text-sm text-text-muted hover:text-text transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回帳戶
        </Link>
      </div>

      <header className="mb-8 md:mb-10 text-center md:text-left">
        <div className="hidden md:flex items-center gap-2 text-[10px] text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          Plans & Pricing
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
          選擇你的<span className="ai-text-gradient"> 預測引擎</span>
        </h1>
        <p className="text-sm md:text-base text-text-muted max-w-2xl md:mx-0 mx-auto leading-relaxed">
          每場 14 項特徵加權、AI 概率評分、冷門黑馬挖掘──
          以量化數據看穿每一場賽事。
        </p>
      </header>

      <PlansClient isAuthed={isAuthed} />
    </div>
  );
}
