"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import {
  verifySignupOtp,
  resendSignupEmail,
  type AuthFormState,
} from "@/app/auth/actions";
import { AuthCard, FormFeedback, SubmitButton } from "@/components/auth/AuthCard";
import { Field } from "@/components/auth/Field";
import { OtpField } from "@/components/auth/OtpField";

export function VerifyEmailForm({
  email,
  hint,
}: {
  email: string;
  hint?: string;
}) {
  const [verifyState, verifyAction, verifyPending] = useActionState<
    AuthFormState,
    FormData
  >(verifySignupOtp, null);
  const [resendState, resendAction, resendPending] = useActionState<
    AuthFormState,
    FormData
  >(resendSignupEmail, null);

  const currentEmail = verifyState?.fields?.email ?? resendState?.fields?.email ?? email;

  return (
    <AuthCard
      title="驗證 Email"
      subtitle={
        hint === "unconfirmed"
          ? `登入前請先驗證 ${currentEmail || "你的 Email"}，請輸入信中的 6 位數驗證碼`
          : currentEmail
            ? `我們已寄出 6 位數驗證碼到 ${currentEmail}`
            : "請輸入註冊時收到的 6 位數驗證碼"
      }
      footer={
        <>
          想用其他帳號？{" "}
          <Link href="/signup" className="text-precision hover:underline">
            返回註冊
          </Link>
        </>
      }
    >
      <form action={verifyAction} className="space-y-3">
        <Field
          id="vEmail"
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

        <FormFeedback
          error={verifyState?.error}
          message={resendState?.message ?? verifyState?.message}
        />

        <SubmitButton pending={verifyPending}>驗證並登入</SubmitButton>
      </form>

      <form action={resendAction} className="mt-3">
        <input type="hidden" name="email" value={currentEmail} />
        <button
          type="submit"
          disabled={resendPending || !currentEmail}
          className="w-full text-xs text-text-muted hover:text-text disabled:opacity-50"
        >
          {resendPending ? "重寄中…" : "沒收到？重新寄送驗證信"}
        </button>
      </form>
    </AuthCard>
  );
}
