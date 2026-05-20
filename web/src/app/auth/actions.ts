"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/auth-errors";
import { buildAuthCallbackUrl } from "@/lib/security/url";

export type AuthFormState = {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
} | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validateEmail(email: string): string | null {
  if (!email) return "請輸入 Email";
  if (!EMAIL_RE.test(email)) return "Email 格式不正確";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "請輸入密碼";
  if (password.length < 8) return "密碼至少 8 個字元";
  return null;
}

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const password = String(formData.get("password") ?? "");
  const fields = { email };

  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, fields };
  if (!password) return { error: "請輸入密碼", fields };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      redirect(
        `/verify-email?mode=signup&email=${encodeURIComponent(email)}&hint=unconfirmed`,
      );
    }
    return { error: translateAuthError(error), fields };
  }

  redirect("/account");
}

export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = readField(formData, "displayName");
  const fields = { email, displayName };

  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, fields };
  const pwErr = validatePassword(password);
  if (pwErr) return { error: pwErr, fields };
  if (password !== confirm) return { error: "兩次輸入的密碼不一致", fields };

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl("/account"),
      data: displayName ? { full_name: displayName } : undefined,
    },
  });
  if (error) {
    return { error: translateAuthError(error), fields };
  }

  if (data.session) {
    redirect("/account");
  }

  redirect(`/verify-email?mode=signup&email=${encodeURIComponent(email)}`);
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: buildAuthCallbackUrl("/account") },
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(translateAuthError(error))}`);
  }
  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function verifySignupOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const token = readField(formData, "token").replace(/\s+/g, "");
  const fields = { email };

  if (!email) return { error: "缺少 Email，請從註冊頁重新開始", fields };
  if (!token || token.length !== 6) {
    return { error: "請輸入 6 位數驗證碼", fields };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    return { error: translateAuthError(error), fields };
  }

  redirect("/account");
}

export async function resendSignupEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const fields = { email };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, fields };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: buildAuthCallbackUrl("/account") },
  });
  if (error) return { error: translateAuthError(error), fields };
  return { message: `驗證信已重寄到 ${email}`, fields };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const fields = { email };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, fields };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl("/account"),
  });
  if (error) {
    return { error: translateAuthError(error), fields };
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export async function resetPasswordWithOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const token = readField(formData, "token").replace(/\s+/g, "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fields = { email };

  if (!email) return { error: "缺少 Email，請從忘記密碼頁重新開始", fields };
  if (!token || token.length !== 6) {
    return { error: "請輸入 6 位數驗證碼", fields };
  }
  const pwErr = validatePassword(password);
  if (pwErr) return { error: pwErr, fields };
  if (password !== confirm) return { error: "兩次輸入的密碼不一致", fields };

  const supabase = await getSupabaseServer();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });
  if (verifyErr) {
    return { error: translateAuthError(verifyErr), fields };
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password });
  if (updateErr) {
    return { error: translateAuthError(updateErr), fields };
  }

  redirect("/account");
}

export async function resendRecoveryEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const fields = { email };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, fields };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl("/account"),
  });
  if (error) return { error: translateAuthError(error), fields };
  return { message: `重設密碼驗證碼已重寄到 ${email}`, fields };
}

export async function resendVerificationFromAccount(): Promise<AuthFormState> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: "請先登入" };
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: buildAuthCallbackUrl("/account") },
  });
  if (error) return { error: translateAuthError(error) };
  return { message: `驗證信已重寄到 ${email}` };
}
