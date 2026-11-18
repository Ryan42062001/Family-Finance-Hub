import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { trustedRequestUrl } from "@/lib/auth/trusted-origin";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: supabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path === "/auth/login" ||
    path === "/auth/sign-up" ||
    path === "/auth/callback" ||
    path === "/auth/confirm" ||
    // Fixed page shown after an account is deleted; it reads nothing (FFH-P08).
    path === "/account/deleted" ||
    // Read-only example household with fixed made-up numbers; it never reads household data (FFH-P03).
    path === "/demo" ||
    // Build metadata (commit SHA and environment) for the automated Preview check; no user or household data (FFH-P04).
    path === "/api/build-info" ||
    // Web app manifest (name, colours, icons only) so phones can add the app to the home screen (FFH-P05).
    path === "/manifest.webmanifest" ||
    // Invite links must open before sign-in; the page shows nothing about the household (FFH-P06).
    /^\/invite\/[A-Za-z0-9_-]{1,64}$/.test(path);

  if (!userId && !isPublic) {
    const trusted = trustedRequestUrl(request.url);
    if (!trusted.trusted) {
      return NextResponse.json({ error: "Authentication origin is not configured." }, { status: 400 });
    }
    return NextResponse.redirect(new URL("/auth/login", trusted.url.origin));
  }

  if (!userId || isPublic) return response;

  // FFH-P08 sign-in gate. The database enforces the same rule on every query (private.session_ok); this only routes
  // the person. "dead": the token's session was ended (password change, 2FA change, account deletion, Owner reset)
  // or cannot be checked; "pending": two-factor sign-in is on and this session has not entered its code with an
  // approved authenticator. Anything unexpected is treated as dead (fail closed).
  const { data: status, error: statusError } = await supabase.rpc("my_security_status");
  const s = !statusError && status && typeof status === "object" && !Array.isArray(status) ? (status as Record<string, unknown>) : null;
  const state = s?.session_ok === true ? "ok" : s?.session_ok === false && s?.two_factor_on === true ? "pending" : "dead";

  const redirectTo = (target: string) => {
    const trusted = trustedRequestUrl(request.url);
    if (!trusted.trusted) {
      return NextResponse.json({ error: "Authentication origin is not configured." }, { status: 400 });
    }
    const redirect = NextResponse.redirect(new URL(target, trusted.url.origin));
    // Keep any cookie changes (refreshed or cleared session) on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (state === "dead") {
    // The server-side session is gone: clear this browser's copy so it does not look signed in.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return redirectTo("/auth/login?message=Please%20sign%20in%20again.");
  }
  if (state === "pending") {
    return path === "/auth/two-factor" ? response : redirectTo("/auth/two-factor");
  }
  if (path === "/auth/two-factor") return redirectTo("/plan");
  return response;
}
