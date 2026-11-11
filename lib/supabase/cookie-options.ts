// Session cookie attributes for every Supabase client (server, proxy, browser).
// @supabase/ssr defaults to path=/, SameSite=Lax, not HttpOnly (the browser
// client must read the session) and does NOT set Secure. Mark the cookie Secure
// for every origin except an explicit plain-HTTP loopback development origin
// (http://localhost, http://127.0.0.1, http://[::1]). Any other http:// origin,
// a missing value or a malformed value fails closed to Secure.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function supabaseCookieOptions(siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): { secure: boolean } {
  if (!siteUrl) return { secure: true };
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    return { secure: true };
  }
  const httpLoopback = url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  return { secure: !httpLoopback };
}
