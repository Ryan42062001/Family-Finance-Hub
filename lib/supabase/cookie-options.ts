// Session cookie attributes for every Supabase client (server, proxy, browser).
// @supabase/ssr defaults to path=/, SameSite=Lax, not HttpOnly (the browser
// client must read the session) and does NOT set Secure. Mark the cookie Secure
// whenever the canonical site origin is HTTPS so it is never sent over plain
// HTTP, including on a future custom domain. Only explicit http:// loopback
// development leaves Secure off.
export function supabaseCookieOptions(siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): { secure: boolean } {
  let protocol = "";
  try {
    protocol = siteUrl ? new URL(siteUrl).protocol : "";
  } catch {
    protocol = "";
  }
  // Fail closed: anything other than an explicit http:// origin gets Secure.
  return { secure: protocol !== "http:" };
}
