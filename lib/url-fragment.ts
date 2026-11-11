// Read the current URL fragment (without '#') as a plain string, or null when it
// is empty or not valid percent-encoding (e.g. "#%ZZ" or a truncated UTF-8
// escape). Callers then fall back to their default section instead of throwing.
export function decodeFragment(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
