import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { buildAppUrl, sanitizeNextPath } from "@/lib/security/url";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"), "/account");
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(buildAppUrl(`/login?error=${encodeURIComponent(errorDescription)}`)),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL(buildAppUrl("/login")));
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(buildAppUrl(`/login?error=${encodeURIComponent(error.message)}`)),
    );
  }

  return NextResponse.redirect(new URL(buildAppUrl(next)));
}
