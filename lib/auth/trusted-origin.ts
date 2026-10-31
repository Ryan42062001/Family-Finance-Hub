const SITE_URL_ENV = "NEXT_PUBLIC_SITE_URL";

type SiteEnvironment = Record<string, string | undefined>;

function loopbackOrigin(url: URL): boolean {
  return url.protocol === "http:"
    && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]");
}

function configuredOrigin(environment: SiteEnvironment): URL | null {
  const value = environment[SITE_URL_ENV];
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/") return null;
  if (url.protocol !== "https:" && !loopbackOrigin(url)) return null;
  return new URL(url.origin);
}

export type TrustedRequestUrlResult =
  | { trusted: true; url: URL }
  | { trusted: false; reason: "missing_site_url" | "invalid_site_url" | "untrusted_request_origin" };

export function trustedRequestUrl(
  requestUrl: string | URL,
  environment: SiteEnvironment = process.env,
): TrustedRequestUrlResult {
  let incoming: URL;
  try {
    incoming = new URL(requestUrl);
  } catch {
    return { trusted: false, reason: "untrusted_request_origin" };
  }

  const configured = configuredOrigin(environment);
  if (!configured) {
    if (environment[SITE_URL_ENV]) return { trusted: false, reason: "invalid_site_url" };
    if (!loopbackOrigin(incoming)) return { trusted: false, reason: "missing_site_url" };
    return { trusted: true, url: incoming };
  }

  if (incoming.origin !== configured.origin) {
    return { trusted: false, reason: "untrusted_request_origin" };
  }

  return {
    trusted: true,
    url: new URL(`${incoming.pathname}${incoming.search}${incoming.hash}`, configured),
  };
}
