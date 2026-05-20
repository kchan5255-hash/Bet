import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ErrorBanner } from "@/components/auth/ErrorBanner";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <Suspense>
        <ErrorBanner message={params.error} />
      </Suspense>
      <ResetPasswordForm email={params.email ?? ""} />
    </div>
  );
}
