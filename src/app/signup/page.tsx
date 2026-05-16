import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ErrorBanner } from "@/components/auth/ErrorBanner";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect("/account");
  }

  const params = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <Suspense>
        <ErrorBanner message={params.error} />
      </Suspense>
      <AuthForm mode="signup" />
    </div>
  );
}
