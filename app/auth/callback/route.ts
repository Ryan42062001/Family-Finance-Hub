import { NextResponse } from "next/server";
import { safeInternalDestination } from "@/lib/auth/safe-destination";
import { trustedRequestUrl } from "@/lib/auth/trusted-origin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const trusted = trustedRequestUrl(request.url);
  if (!trusted.trusted) {
    return NextResponse.json({ error: "Authentication origin is not configured." }, { status: 400 });
  }
  const url = trusted.url;
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
