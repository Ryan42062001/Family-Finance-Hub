import { NextResponse } from "next/server";
import { safeInternalDestination } from "@/lib/auth/safe-destination";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalDestination(url, url.searchParams.getAll("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(next);
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Unable%20to%20confirm%20your%20account.", url.origin),
  );
}
