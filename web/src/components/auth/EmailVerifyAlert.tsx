"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Mail, Send } from "lucide-react";
import {
  resendVerificationFromAccount,
  type AuthFormState,
} from "@/app/auth/actions";

export function EmailVerifyAlert({ email }: { email: string | null }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    () => resendVerificationFromAccount(),
    null,
  );

  return (
    <div className="mt-4 rounded-xl border border-upset/30 bg-upset/10 px-3 py-2.5 text-xs text-upset-glow">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          你的 Email {email ? <strong>{email}</strong> : ""} 尚未驗證。請查收信箱中的驗證信，點擊連結或回到驗證頁輸入 6 位數驗證碼完成驗證。
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-upset/40 bg-upset/15 px-3 py-1.5 text-[11px] font-semibold hover:bg-upset/25 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {pending ? "重寄中…" : "重寄驗證信"}
          </button>
        </form>
        {email ? (
          <a
            href={`/verify-email?email=${encodeURIComponent(email)}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-3 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text"
          >
            <Mail className="h-3 w-3" />
            前往驗證頁
          </a>
        ) : null}
      </div>

      {state?.message ? (
        <div className="mt-2 flex items-center gap-1.5 text-precision">
          <CheckCircle2 className="h-3 w-3" />
          <span>{state.message}</span>
        </div>
      ) : null}
      {state?.error ? (
        <div className="mt-2 text-danger">{state.error}</div>
      ) : null}
    </div>
  );
}
