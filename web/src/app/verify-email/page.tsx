import { Suspense } from "react";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { ErrorBanner } from "@/components/auth/ErrorBanner";
import { getSupabaseServer } from "@/lib/supabase/server";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; hint?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user?.email_confirmed_at || data.user?.confirmed_at) {
    redirect("/account");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <Suspense>
        <ErrorBanner message={params.error} />
      </Suspense>
      <VerifyEmailForm email={params.email ?? ""} hint={params.hint} />
    </div>
  );
}
