import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../../app/globals.css");
const layout = read("../../app/layout.tsx");
const toggle = read("../../components/ThemeToggle.tsx");
const header = read("../../components/AppHeader.tsx");

test("FFH-P02 defines light tokens and both dark-mode paths (device setting and explicit choice)", () => {
  assert.match(css, /:root \{[\s\S]*?--bg:#f6f7f9/);
  assert.match(css, /:root\[data-theme=dark\]\{[\s\S]*?color-scheme: dark/);
  assert.match(css, /@media\(prefers-color-scheme:dark\)\{:root:not\(\[data-theme=light\]\)\{/);
  // Legacy token names stay mapped so older rules follow the theme.
  for (const legacy of ["--forest-800:var(--accent)", "--sage-100:var(--accent-soft)", "--navy-900:var(--heading)"]) {
    assert.ok(css.includes(legacy), legacy);
  }
});

test("FFH-P02 theme choice is a browser-only display preference", () => {
  // Pre-paint script: reads one key, accepts only light/dark, never throws.
  assert.match(layout, /localStorage\.getItem\("ffh-theme"\)/);
  assert.match(layout, /t==="light"\|\|t==="dark"/);
  assert.match(layout, /catch\(e\)\{\}/);
  assert.match(layout, /<html lang="en" suppressHydrationWarning>/);
  // The toggle stores only the theme value and makes no network or server call.
  assert.match(toggle, /THEME_STORAGE_KEY = "ffh-theme"/);
  assert.match(toggle, /localStorage\.setItem\(THEME_STORAGE_KEY, next\)/);
  assert.doesNotMatch(toggle, /fetch\(|supabase|"use server"|cookie/i);
  assert.match(toggle, /aria-label=\{dark \? "Switch to light mode" : "Switch to dark mode"\}/);
  assert.match(toggle, /aria-pressed=\{dark\}/);
});

test("FFH-P02 toggle is available signed in and signed out without exposing app tabs", () => {
  assert.match(header, /<ThemeToggle \/>/);
  const toggleIndex = header.indexOf("<ThemeToggle />");
  const navBlock = header.slice(header.indexOf("{authenticated ? ("), header.indexOf(") : null}") + 9);
  assert.ok(!navBlock.includes("<ThemeToggle />"), "toggle must not be inside the signed-in-only nav");
  assert.ok(toggleIndex > 0);
});

test("FFH-P02 money-flow chart colours come from theme tokens", () => {
  const flow = read("../../components/dashboard/MonthlyMoneyFlow.tsx");
  assert.match(flow, /essential: "var\(--flow-essential\)"/);
  assert.doesNotMatch(flow, /fill="#[0-9a-fA-F]{6}"/);
  for (const token of ["--flow-essential", "--flow-remaining", "--flow-deficit", "--flow-halo"]) {
    assert.equal((css.match(new RegExp(token + ":", "g")) ?? []).length, 3, token + " defined for light, dark and device-dark");
  }
});
