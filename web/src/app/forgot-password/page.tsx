import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ErrorBanner } from "@/components/auth/ErrorBanner";
import { getSupabaseServer } from "@/lib/supabase/server";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect("/account");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <Suspense>
        <ErrorBanner message={params.error} />
      </Suspense>
      <ForgotPasswordForm defaultEmail={params.email ?? ""} />
    </div>
  );
}
