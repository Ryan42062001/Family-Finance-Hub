import { NextResponse } from "next/server";
import { safeInternalDestination, singleBoundedAuthParameter } from "@/lib/auth/safe-destination";
import { createClient } from "@/lib/supabase/server";

const MAX_TOKEN_HASH_LENGTH = 1024;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = singleBoundedAuthParameter(url.searchParams.getAll("token_hash"), MAX_TOKEN_HASH_LENGTH);
  const types = url.searchParams.getAll("type");
  const next = safeInternalDestination(url, url.searchParams.getAll("next"));

  if (tokenHash && types.length === 1 && types[0] === "email") {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: tokenHash,
      });

      if (!error && data.session) {
        return NextResponse.redirect(next);
      }
    } catch {
      // Unexpected provider/client failures use the same token-free generic path.
    }
  }

  return NextResponse.redirect(
    new URL(
      "/auth/login?error=Unable%20to%20confirm%20your%20account.",
      url.origin,
    ),
  );
}
