"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  type AuthFormState,
} from "@/app/auth/actions";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "login" ? signInWithPassword : signUpWithPassword;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    null,
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          {mode === "login" ? "登入 Furlong" : "建立帳號"}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {mode === "login"
            ? "使用 email 與密碼登入"
            : "輸入 email 與密碼，註冊後會收到驗證信"}
        </p>

        <form action={signInWithGoogle} className="mt-6">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-subtle px-4 py-2.5 text-sm font-semibold hover:border-text-muted transition"
          >
            <GoogleIcon className="h-4 w-4" />
            使用 Google {mode === "login" ? "登入" : "註冊"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-text-subtle">
          <span className="h-px flex-1 bg-border" />
          或使用 Email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="space-y-3">
          <Field
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            required
          />
          <Field
            id="password"
            name="password"
            type="password"
            label="密碼"
            placeholder={mode === "signup" ? "至少 8 個字元" : "輸入密碼"}
            icon={<Lock className="h-4 w-4" />}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />

          {state?.error ? (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          ) : null}

          {state?.message ? (
            <div className="flex items-start gap-2 rounded-lg border border-precision/30 bg-precision/10 px-3 py-2 text-xs text-precision">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className={cn(
              "w-full rounded-xl ai-gradient px-4 py-2.5 text-sm font-semibold text-white transition",
              pending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
            )}
          >
            {pending
              ? "處理中..."
              : mode === "login"
                ? "登入"
                : "註冊"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-muted">
          {mode === "login" ? (
            <>
              還沒有帳號？{" "}
              <Link href="/signup" className="text-precision hover:underline">
                立即註冊
              </Link>
            </>
          ) : (
            <>
              已經有帳號？{" "}
              <Link href="/login" className="text-precision hover:underline">
                返回登入
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  name,
  type,
  label,
  placeholder,
  icon,
  autoComplete,
  minLength,
  required,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  icon: React.ReactNode;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3 focus-within:border-text-muted">
        <span className="text-text-subtle">{icon}</span>
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-text-subtle"
        />
      </div>
    </label>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-2H12z"
      />
    </svg>
  );
}
