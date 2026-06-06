import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const createdAt = new Date(data.user.created_at).getTime();
      const lastSignIn = new Date(data.user.last_sign_in_at ?? data.user.created_at).getTime();
      const isNew = lastSignIn - createdAt < 30_000;
      return NextResponse.redirect(`${origin}${isNew ? "/auth/setup" : "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
