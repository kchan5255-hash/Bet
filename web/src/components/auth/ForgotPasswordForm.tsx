"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";
import {
  requestPasswordReset,
  type AuthFormState,
} from "@/app/auth/actions";
import { AuthCard, FormFeedback, SubmitButton } from "@/components/auth/AuthCard";
import { Field } from "@/components/auth/Field";

export function ForgotPasswordForm({
  defaultEmail = "",
}: {
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    null,
  );
  const initialEmail = state?.fields?.email ?? defaultEmail;

  return (
    <AuthCard
      title="忘記密碼"
      subtitle="輸入註冊時的 Email，我們會寄出 6 位數驗證碼到你的信箱"
      footer={
        <>
          想起來了？{" "}
          <Link href="/login" className="text-precision hover:underline">
            返回登入
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-3">
        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
          defaultValue={initialEmail}
          placeholder="you@example.com"
        />

        <FormFeedback error={state?.error} message={state?.message} />

        <SubmitButton pending={pending}>寄送驗證碼</SubmitButton>
      </form>
    </AuthCard>
  );
}
