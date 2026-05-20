"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import {
  resetPasswordWithOtp,
  resendRecoveryEmail,
  type AuthFormState,
} from "@/app/auth/actions";
import { AuthCard, FormFeedback, SubmitButton } from "@/components/auth/AuthCard";
import { Field, PasswordField } from "@/components/auth/Field";
import { OtpField } from "@/components/auth/OtpField";

export function ResetPasswordForm({ email }: { email: string }) {
  const [resetState, resetAction, resetPending] = useActionState<
    AuthFormState,
    FormData
  >(resetPasswordWithOtp, null);
  const [resendState, resendAction, resendPending] = useActionState<
    AuthFormState,
    FormData
  >(resendRecoveryEmail, null);

  const currentEmail = resetState?.fields?.email ?? resendState?.fields?.email ?? email;

  return (
    <AuthCard
      title="重設密碼"
      subtitle={
        currentEmail
          ? `輸入寄到 ${currentEmail} 的 6 位數驗證碼，並設定新密碼`
          : "輸入信中的 6 位數驗證碼，並設定新密碼"
      }
      footer={
        <>
          想起來了？{" "}
          <Link href="/login" className="text-precision hover:underline">
            返回登入
          </Link>
        </>
      }
    >
      <form action={resetAction} className="space-y-3">
        <Field
          id="rEmail"
          name="email"
          type="email"
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
          defaultValue={currentEmail}
          placeholder="you@example.com"
        />
        <OtpField name="token" length={6} />
        <PasswordField
          id="password"
          name="password"
          label="新密碼"
          placeholder="至少 8 個字元"
          autoComplete="new-password"
          minLength={8}
          required
          hint="建議混合英文字母與數字"
        />
        <PasswordField
          id="confirm"
          name="confirm"
          label="確認新密碼"
          placeholder="再輸入一次"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <FormFeedback
          error={resetState?.error}
          message={resendState?.message ?? resetState?.message}
        />

        <SubmitButton pending={resetPending}>更新密碼並登入</SubmitButton>
      </form>

      <form action={resendAction} className="mt-3">
        <input type="hidden" name="email" value={currentEmail} />
        <button
          type="submit"
          disabled={resendPending || !currentEmail}
          className="w-full text-xs text-text-muted hover:text-text disabled:opacity-50"
        >
          {resendPending ? "重寄中…" : "沒收到？重新寄送驗證碼"}
        </button>
      </form>
    </AuthCard>
  );
}
