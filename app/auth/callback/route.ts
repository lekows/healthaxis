import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const loginUrl = new URL(`${origin}/auth/login`);
    loginUrl.searchParams.set("oauth_error", errorDescription ?? error);
    return NextResponse.redirect(loginUrl.toString());
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.user) {
      const createdAt = new Date(data.user.created_at).getTime();
      const lastSignIn = new Date(data.user.last_sign_in_at ?? data.user.created_at).getTime();
      const isNew = lastSignIn - createdAt < 30_000;
      return NextResponse.redirect(`${origin}${isNew ? "/auth/setup" : "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
