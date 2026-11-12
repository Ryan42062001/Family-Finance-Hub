"use client";
import { useEffect, useSyncExternalStore } from "react";

// Light/dark switch. The choice is a display preference only: it is stored in
// this browser (localStorage), never sent to the server or the database.
// Without a stored choice the device setting (prefers-color-scheme) applies.
export const THEME_STORAGE_KEY = "ffh-theme";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const THEME_EVENT = "ffh-theme-change";

// Re-render when the user toggles or the device setting changes.
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

// Re-apply the saved choice after mount. The pre-paint script in the layout sets it first; this covers the case
// where React rebuilds the page on the client (for example after a hydration mismatch) and drops the attribute.
function reapplyStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if ((stored === "light" || stored === "dark") && document.documentElement.dataset.theme !== stored) {
      document.documentElement.dataset.theme = stored;
      window.dispatchEvent(new Event(THEME_EVENT));
    }
  } catch {
    // Storage unavailable: the device setting applies.
  }
}

export default function ThemeToggle() {
  // null on the server: the icon is decided only in the browser.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  useEffect(reapplyStoredTheme, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the switch still applies for this page.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const dark = theme === "dark";
  return (
    <button type="button" className="theme-toggle" onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark}
      title={dark ? "Light mode" : "Dark mode"}>
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
