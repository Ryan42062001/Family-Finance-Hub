# FFH-051 — Independent Technical / Security Audit

**Verdict: FAIL — REMEDIATION REQUIRED**

## Frozen authority

- Role: Technical & Mathematical Auditor, independent technical/security reviewer.
- Execution: STANDARD_CHAT_HIGH; FAST_REFRESH.
- Immutable production target: e9ff76d6e5309f36f5648c034cd24f94b5ce7fbb.
- Target source: app/auth/confirm/route.ts, Git blob ca486ca5b78cfe3d2afd4b7daf6914a62c94f587.
- PR #70: OPEN, DRAFT, UNMERGED at initial refresh and prior to report.
- Canonical main / audit branch starting commit: e747d27ddc16c97413bc9832fba37e40797e5a01.
- Manager routing: PR #70 comment 5746140023.
- Source reviewed: canonical WORKFLOW_V3_1.md, WORKFLOW_V3.md, WORKFLOW.md (V2); technical-audit role charter, FFH-026, production PR/target, app/auth/confirm/route.ts, app/auth/callback/route.ts, app/auth/actions.ts, lib/supabase/server.ts, lib/supabase/proxy.ts, proxy.ts, dashboard, onboarding and profile actions, scenario authority, the phase-5 role-aware RLS migration and its contract tests.
- Production change is ONE newly added 37-line confirm route. No changes to RLS, migrations, packages, authorization, financial engine or existing callback.
- Audit-only fixtures/tests do not replace, modify, deploy, or silently advance the production target.

## Findings / severity

**FFH-051-SEC-01 — HIGH — BLOCKING: New confirm route is not public; login redirect retains token.**

The root proxy matches /auth/confirm but its public-route predicate in lib/supabase/proxy.ts lists /, /auth/login, /auth/sign-up, /auth/callback, not /auth/confirm. An anonymous recipient is redirected before verifying their signup token. The proxy clones the entire incoming URL and only changes pathname to /auth/login, preserving token_hash and type query parameters. Independent source-derived regression and URL transformation using a SYNTHETIC token reproduce both defects. This is a release-blocking flow failure and needless propagation of an authentication credential in an unrelated browser URL, not proof of exfiltration to an attacker.

Remediate: add exact public /auth/confirm without weakening protected routes; on auth-failure redirects construct a fresh URL with no token_hash, code or other sensitive parameters; test proxy-first anonymous confirmation and absence of token in redirect Location.

**FFH-051-SEC-02 — HIGH — BLOCKING: Same-origin validator permits cross-origin backslash target.**

Frozen route lines 5-11 allow a slash followed by a backslash; success path line 26 builds new URL(next, url.origin). The value consisting of slash, backslash and evil.example/p passes safeNextPath and resolves under WHATWG URL rules to https://evil.example/p. Incoming %5C-encoded backslash is decoded by URLSearchParams before validation. Plain //evil.example is rejected, but this does not defeat the bypass. Independent source-derived harness and standalone Node URL reproduction confirm external navigation after simulated successful verification. This establishes redirect/phishing abuse, NOT session theft.

Remediate: validate the final parsed URL against a trusted configured app origin AND strict internal destination policy; reject backslashes, raw/encoded separators, controls, protocol-relative, malformed, foreign-origin, and nested redirect targets. Test each with final destination assertions and legitimate internal path controls.

**FFH-051-SEC-03 — MEDIUM — BLOCKING: OTP type not runtime-allowlisted.**

Line 17 casts user-controlled type to EmailOtpType; a TypeScript cast does not validate HTTP input. Any nonempty type is sent to verifyOtp, including recovery, invite, email_change, sms and arbitrary_type in the independent harness. This is purpose confusion, not proof a provider will accept a mismatched token.

Remediate: accept EXACT intended signup email type email only; reject missing, duplicated, ambiguous and other types before provider call; test that invalid values never reach verifyOtp.

**FFH-051-SEC-04 — MEDIUM — RELEASE VALIDATION BLOCKER: Session/cookie establishment not independently proven.**

Lines 23-27 inspect only the provider error. The harness shows a mock {error:null, data:{session:null}} produces a dashboard redirect. The existing SSR server client uses Next cookies and proxy refreshes claims; this is promising source-level plumbing, not a demonstrated Set-Cookie response or fresh first authenticated dashboard request. No proof of cross-user or cross-household access follows from this gap.

Remediate/evidence: confirm authenticated identity and actual cookie round trip with isolated synthetic account(s) on an authorized safe deployment, including first dashboard request and logged-in account switching semantics. Do not equate navigation with login success.

**FFH-051-SEC-05 — MEDIUM — BLOCKING ERROR PATH: Uncaught provider/client exception.**

Client creation and verifyOtp lack an exception boundary. A rejected verifyOtp promise escapes instead of the generic fail-closed login path. Normal provider {error} and missing-token paths do return generic login errors, but this does not cover exceptions. This finding is an availability/error-handling issue; an authorization bypass is not established.

Remediate: catch unexpected exceptions, avoid secret-bearing/raw provider diagnostics, prevent success navigation and partial-session cookies, test rejected promises and thrown client errors.

**FFH-051-SEC-06 — MEDIUM — PRE-EXISTING ADJACENT: PKCE callback open redirect.**

Unchanged app/auth/callback/route.ts accepts raw next into new URL(next, url.origin) after successful code exchange. It can likewise resolve an external URL. This predates PR #70 and must not be attributed to the new file. Manager should separately route a bounded auth callback destination check before declaring the full release auth surface safe; preserve existing PKCE code-exchange semantics.

**FFH-051-SEC-07 — LOW — HARDENING: Token-hash size/shape and duplicate parameter ambiguity.**

The new handler checks token_hash only for truthiness, then delegates malformed, oversized, duplicated or whitespace values to provider behavior. No token acceptance bypass has been demonstrated. Define bounded input format only after checking actual documented provider output, reject ambiguities and preserve generic errors.

## Positive controls and explicitly unverified gates

- Ordinary missing token/type or provider {error} returns generic login failure from the handler, with no token hash in that handler's own failure redirect. Upstream proxy URL propagation is a separate defect.
- Plain //external redirects to default /dashboard; ordinary /dashboard or /onboarding remain internal in the frozen route-only harness.
- The route does not read household IDs, query financial tables, or use elevated service-role credentials.
- Protected dashboard checks claims. Onboarding/profile actions derive identity/household server-side; scenario authority uses server-side membership resolution. These are source-level controls, not an independently executed live multi-household isolation test.
- Existing role-aware migration defines membership-derived private RLS read/write helpers, per-household predicates, owner/member versus viewer permissions and UPDATE WITH CHECK. The security tests inspect SQL source text. PR #70 adds no migration/RLS change. Production database policy installation and cross-household SELECT/INSERT/UPDATE/DELETE remain UNVERIFIED here.
- Official Supabase Next.js SSR documentation describes intended Confirm Signup template: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email. The PR requires it, but the hosted template contents, SiteURL and redirect allowlist have NOT been independently read. Do not claim they have been updated.
- Real invalid/expired/reused/mismatched token behavior, actual provider session, browser cookies, first authenticated request, email prefetch handling and runtime Origin/Host trust remain NOT VERIFIED. No production writes, live secrets, real-user tokens, real-household data, merge or deployment occurred.
- No observed privacy breach or actual cross-household access is claimed.

Official design references: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs ; https://supabase.com/docs/reference/javascript/auth-verifyotp ; https://supabase.com/docs/guides/auth/auth-email-templates ; https://nextjs.org/docs/app/api-reference/file-conventions/proxy ; https://nextjs.org/docs/app/api-reference/functions/cookies .

## Reproducibility and validation

Audit-only fixture: .ai/audit/technical/fixtures/FFH-051_FROZEN_CONFIRM_ROUTE_e9ff76d6.txt, exact frozen route Git blob ca486ca5b78cfe3d2afd4b7daf6914a62c94f587.

Adversarial characterization test: tests/security/ffh-051-frozen-auth-adversarial.test.ts. Nine synthetic-token/mock-provider tests: fixture integrity; proxy intercept; token query retention; cross-origin backslash; normal redirect controls; arbitrary OTP types; no-session success; missing/invalid token controls; rejected provider promise. They intentionally reproduce frozen defects; a repaired-target acceptance suite must invert unsafe expectations.

Local Node v22.16.0 reconstructed frozen fixture/proxy run with node --experimental-strip-types --test: **9 passed, 0 failed**, after correcting a test-harness-only TypeScript parameter-stripping bug. This is not full-repository or live Supabase integration CI. Audit PR CI must validate the committed suite.

Original product FULL Foundation CI independently inspected: run 35458182333, job 105985484078 completed SUCCESS, with dependency audit, calculations, existing security tests, typecheck, lint, build and guardrails successful. Green CI does not negate confirmed defects.

## Manager disposition / bounded remediation

**FAIL — REMEDIATION REQUIRED** applies ONLY to production e9ff76d6e5309f36f5648c034cd24f94b5ce7fbb. Keep PR #70 DRAFT / UNMERGED and FFH-026 release integration BLOCKED. No deployment, private beta, real-user testing or production auth writes authorized by this audit.

Manager should accept/reject each finding independently; route minimal FFH-051 auth/proxy remediation; separately disposition inherited PKCE callback; require security acceptance tests, fresh FULL CI, immutable repaired SHA, verified hosted template/site/redirect configuration, privacy-safe test-account cookie and token-lifecycle smoke and household-isolation release evidence, then commission a NEW independent security re-audit. This report does not self-approve implementation or authorize merge.
