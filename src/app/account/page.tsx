import { AccountPanel } from "@/components/AccountPanel";
import { getSupabaseServer } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-8">
      <header className="hidden md:block mb-8">
        <div className="flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          My Account
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          帳戶管理
        </h1>
        <p className="text-sm text-text-muted leading-relaxed">
          管理個人資料、訂閱狀態與付款方式
        </p>
      </header>

      <p className="md:hidden mb-4 text-xs text-text-muted leading-relaxed">
        管理個人資料、訂閱狀態與付款方式
      </p>

      <AccountPanel user={data.user} />
    </div>
  );
}
