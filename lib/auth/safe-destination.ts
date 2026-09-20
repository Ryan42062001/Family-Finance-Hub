const DEFAULT_DESTINATION = "/dashboard";
const MAX_DESTINATION_LENGTH = 2048;
const ENCODED_SEPARATOR = /%(?:2f|5c|25)/i;
const UNSAFE_CHARACTER = /[\\\u0000-\u001f\u007f\s]/;
const NESTED_REDIRECT_KEYS = new Set([
  "callback",
  "continue",
  "destination",
  "next",
  "redirect",
  "redirect_to",
  "return",
  "return_to",
  "url",
]);

export function singleBoundedAuthParameter(
  values: readonly string[],
  maxLength: number,
): string | null {
  if (values.length !== 1) return null;
  const value = values[0];
  if (!value || value.length > maxLength || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

export function safeInternalDestination(
  requestUrl: URL,
  values: readonly string[],
  fallback = DEFAULT_DESTINATION,
): URL {
  const fallbackUrl = new URL(fallback, requestUrl.origin);
  if (values.length === 0) return fallbackUrl;
  if (values.length !== 1) return fallbackUrl;

  const value = values[0];
  if (
    !value ||
    value.length > MAX_DESTINATION_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    UNSAFE_CHARACTER.test(value) ||
    ENCODED_SEPARATOR.test(value)
  ) {
    return fallbackUrl;
  }

  let destination: URL;
  try {
    destination = new URL(value, requestUrl.origin);
  } catch {
    return fallbackUrl;
  }

  if (destination.origin !== requestUrl.origin) return fallbackUrl;
  if (destination.pathname.includes("\\") || destination.pathname.startsWith("//")) return fallbackUrl;
  if ([...destination.searchParams.keys()].some((key) => NESTED_REDIRECT_KEYS.has(key.toLowerCase()))) {
    return fallbackUrl;
  }

  return destination;
}
