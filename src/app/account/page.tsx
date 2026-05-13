import { AccountPanel } from "@/components/AccountPanel";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
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

      <AccountPanel />
    </div>
  );
}
