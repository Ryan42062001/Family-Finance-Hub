import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DETAILED_ONLY_PREFIXES, isDetailedOnlyPath, readSimpleMode, safeReturnPath, SIMPLE_NAV_PATHS } from "../../lib/profile/view-mode.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261113210000_ffh_p05_profile_simple_mode.sql");
const action = read("app/account/actions.ts");
const header = read("components/AppHeader.tsx");
const mobile = read("components/MobileNavigation.tsx");
const notice = read("components/DetailedToolNotice.tsx");
const dashboard = read("app/dashboard/page.tsx");
const e2e = read("scripts/e2e/isolation.mjs");

test("FFH-P05 migration adds only a per-user column, off by default, on the self-scoped profiles table", () => {
  const sql = migration.replace(/--.*$/gm, "");
  assert.match(sql, /alter table public\.profiles\s+add column simple_mode boolean not null default false;/);
  // No new policy, grant, function, trigger, or RLS change: the existing self-only policies cover it.
  assert.doesNotMatch(sql, /create policy|alter policy|drop policy|grant |revoke |create (or replace )?function|create trigger|row level security|security definer/i);
  const statements = sql.replace(/'(?:[^']|'')*'/g, "''").split(";").map((part) => part.trim()).filter(Boolean);
  assert.equal(statements.length, 2, "one ALTER TABLE and one COMMENT only");
  assert.match(statements[1], /^comment on column public\.profiles\.simple_mode is\s+''$/);
});

test("FFH-P05 the switch writes only the caller's own profile row, with a strict value and a fixed return page", () => {
  assert.match(action, /^"use server";/);
  assert.match(action, /const userId = data\?\.claims\?\.sub;\n\s+if \(!userId\) redirect\("\/auth\/login"\);/);
  assert.match(action, /if \(choice !== "on" && choice !== "off"\)/);
  assert.match(action, /\.from\("profiles"\)\.upsert\(\{ id: userId, simple_mode: choice === "on" \}, \{ onConflict: "id" \}\)/);
  // Nothing else is written, and no id comes from the form.
  assert.equal((action.match(/\.from\(/g) ?? []).length, 1);
  assert.doesNotMatch(action, /formData\.get\("id"\)|household/);
  // Return page is allowlisted, never an arbitrary URL.
  assert.equal(safeReturnPath("/dashboard"), "/dashboard");
  assert.equal(safeReturnPath("/scenario-lab"), "/scenario-lab");
  for (const bad of ["https://evil.example/", "//evil.example", "/plan?x=1", "/auth/login", "", null, 42, "/plan/../admin"]) {
    assert.equal(safeReturnPath(bad), "/plan", String(bad));
  }
});

test("FFH-P05 reading the preference fails safe to the full detailed view", async () => {
  const fake = (result: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const call = (result: unknown, user: string | null = "u") => readSimpleMode(fake(result) as any, user);
  assert.equal(await call({ data: { simple_mode: true }, error: null }), true);
  assert.equal(await call({ data: { simple_mode: false }, error: null }), false);
  assert.equal(await call({ data: null, error: null }), false);
  assert.equal(await call({ data: { simple_mode: "true" }, error: null }), false);
  assert.equal(await call({ data: { simple_mode: true }, error: { message: "x" } }), false);
  assert.equal(await call({ data: { simple_mode: true }, error: null }, null), false);
});

test("FFH-P05 Simple view keeps Plan, Overview and Profile in both menus and marks detailed tools", () => {
  assert.deepEqual([...SIMPLE_NAV_PATHS], ["/plan", "/dashboard", "/financial-profile"]);
  assert.match(header, /const simple = authenticated \? await readSimpleMode\(supabase, data\?\.claims\?\.sub\) : false;/);
  assert.match(header, /\{shown\.map\(\(\[name, href\]\) => <DesktopNavLink/);
  assert.match(header, /<SimpleModeSwitch simple=\{simple\} \/><form action=\{logout\}>/);
  assert.match(header, /<MobileNavigation simple=\{simple\} \/>/);
  assert.match(mobile, /const shown = simple \? links\.filter/);
  for (const path of ["/planning", "/planning/debt", "/scenario-lab", "/financial-profile/hsa", "/financial-profile/simple"]) assert.ok(isDetailedOnlyPath(path), path);
  for (const path of ["/plan", "/dashboard", "/financial-profile", "/planningx"]) assert.equal(isDetailedOnlyPath(path), false, path);
  const pages: Record<string, string> = {
    "/planning": "app/planning/page.tsx", "/planning/debt": "app/planning/debt/page.tsx",
    "/planning/paycheck": "app/planning/paycheck/page.tsx", "/planning/retirement": "app/planning/retirement/page.tsx",
    "/scenario-lab": "app/scenario-lab/page.tsx", "/financial-profile/hsa": "app/financial-profile/hsa/page.tsx",
    "/financial-profile/simple": "app/financial-profile/simple/page.tsx",
  };
  assert.equal(Object.keys(pages).length, 7);
  for (const [path, file] of Object.entries(pages)) assert.ok(read(file).includes(`<DetailedToolNotice path="${path}" />`), file);
  assert.ok(DETAILED_ONLY_PREFIXES.length >= 4);
  assert.match(notice, /if \(!\(await readSimpleMode\(supabase, data\?\.claims\?\.sub\)\)\) return null;/);
});

test("FFH-P05 Simple view only hides detail on Overview; the plan summary and key numbers stay", () => {
  assert.match(dashboard, /const simple = await readSimpleMode\(supabase, claimsData\.claims\.sub\);/);
  assert.match(dashboard, /\{simple \? null : <article className="bento-card bento-health">/);
  assert.match(dashboard, /\{simple \? null : <><MonthlyMoneyFlow input=\{moneyFlowInput\} \/>/);
  assert.match(dashboard, /\{simple \? null : <div className="mobile-dashboard-details">/);
  assert.equal((dashboard.match(/<PlanSummary /g) ?? []).length, 2, "plan summary stays on phone and desktop");
  // No link into the detailed Planning tools from Overview in Simple view.
  assert.equal((dashboard.match(/\{simple \? null : <Link[^>]*href="\/planning">Planning tools<\/Link>\}/g) ?? []).length, 2);
  assert.doesNotMatch(dashboard.replace(/\{simple \? null : <Link[^>]*href="\/planning">Planning tools<\/Link>\}/g, ""), /href="\/planning"/);
});

test("FFH-P05 the automated isolation check signs out with the Sign out button, never the Simple view switch", () => {
  assert.match(e2e, /page\.click\("\.account-menu button\.nav-sign-out"\)/);
  assert.doesNotMatch(e2e, /account-menu form button\[type=submit\]|simple-mode/);
});
