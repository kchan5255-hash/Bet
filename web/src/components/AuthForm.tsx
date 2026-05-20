"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, User } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  type AuthFormState,
} from "@/app/auth/actions";
import { AuthCard, FormFeedback, SubmitButton } from "@/components/auth/AuthCard";
import { Field, PasswordField } from "@/components/auth/Field";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  defaultEmail = "",
}: {
  mode: Mode;
  defaultEmail?: string;
}) {
  const action = mode === "login" ? signInWithPassword : signUpWithPassword;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    null,
  );

  const initialEmail = state?.fields?.email ?? defaultEmail;
  const initialName = state?.fields?.displayName ?? "";

  return (
    <AuthCard
      title={mode === "login" ? "登入 Furlong" : "建立帳號"}
      subtitle={
        mode === "login"
          ? "使用 Email 與密碼登入，或選擇 Google 一鍵登入"
          : "註冊後我們會寄出 6 位數驗證碼到你的 Email"
      }
      footer={
        mode === "login" ? (
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
        )
      }
    >
      <form action={signInWithGoogle}>
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
        {mode === "signup" ? (
          <Field
            id="displayName"
            name="displayName"
            label="顯示名稱（選填）"
            placeholder="如何稱呼你"
            icon={<User className="h-4 w-4" />}
            autoComplete="name"
            maxLength={40}
            defaultValue={initialName}
          />
        ) : null}

        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
          defaultValue={initialEmail}
        />

        <PasswordField
          id="password"
          name="password"
          label="密碼"
          placeholder={mode === "signup" ? "至少 8 個字元" : "輸入密碼"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
          hint={mode === "signup" ? "建議混合英文字母與數字" : undefined}
        />

        {mode === "signup" ? (
          <PasswordField
            id="confirm"
            name="confirm"
            label="確認密碼"
            placeholder="再輸入一次密碼"
            autoComplete="new-password"
            minLength={8}
            required
          />
        ) : (
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-text-muted hover:text-text"
            >
              忘記密碼？
            </Link>
          </div>
        )}

        <FormFeedback error={state?.error} message={state?.message} />

        <SubmitButton pending={pending}>
          {mode === "login" ? "登入" : "建立帳號"}
        </SubmitButton>
      </form>
    </AuthCard>
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
