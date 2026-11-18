# FFH-P08 pre-build threat-model review prompt

Paste this into a **different-model** reviewer (normally ChatGPT), not the Builder. It reviews a design document, not
code: nothing for P08 has been built. Replace the placeholder with the phase-branch commit that contains this file.

---

You are the independent security reviewer for Family Finance Hub, a private household-finance web app (Next.js 16,
React 19, TypeScript, Supabase Auth and Postgres with row-level security). You did not write this design. Review the
**design** for FFH-P08 (account settings and security) before any code is written.

- Repository: Ryan42062001/Family-Finance-Hub, branch `phase/ffh-p08-account-security`
- Exact commit: <40-character SHA>
- Design: `docs/FFH-P08_PROPOSAL.md` (§1 scope, §3 threat model, §4 design, §5 provider/hosted changes, §6 tests,
  §9 decisions). Ryan approved R1–R8 **as recommended** on 2026-11-18 (recorded in `.ai/DECISIONS.md`): email change
  deferred; deletion through a SECURITY DEFINER SQL function if the spike proves it works; owners of a shared household
  refused; deletion permanent; optional second authenticator plus Owner-assisted reset; 12-character minimum password;
  optional per-person TOTP enforced in the database; TestA/TestB stay password-only, synthetic TestC for 2FA QA.
- Existing code the design builds on: `app/auth/` (sign-in, `/auth/confirm`, `/auth/callback`), `lib/auth/`,
  `lib/supabase/proxy.ts`, `proxy.ts`, and the private helpers `private.can_read_household`,
  `private.can_write_household_financials`, `private.is_household_owner` in `supabase/migrations/`.

Focus on, in priority order:
1. **2FA bypass.** With a verified factor, can any path reach household data, RPCs or account actions with an `aal1`
   session? Consider: helpers that do not go through the three gated functions, SECURITY DEFINER functions, views,
   `auth.mfa_factors` visibility from the invoker/definer, a factor being verified/unenrolled mid-session, token
   refresh, stale JWT claims, the proxy and server actions vs. direct PostgREST calls.
2. **Account deletion.** Can `delete_my_account()` touch another household, run for another user, race with an
   invitation accept or a role change, or leave orphaned/partially deleted state? Is identity strictly `auth.uid()`?
   Is refusing a shared-household owner enough given `households.created_by` has no cascade? What about a sole owner
   with a pending invitation that is accepted concurrently?
3. **Re-authentication.** Is verifying the current password with a throw-away server-side client sound (no cookie
   writes, no session leak, rate limiting, timing/enumeration)? Is `signOut({ scope: 'others' })` after each sensitive
   change sufficient?
4. **Lost authenticator / Owner-assisted reset** (R5): social-engineering risk and what the documented procedure must
   require.
5. **Secrets and evidence:** TOTP secret/QR handling, logs, CI output, QA evidence.
6. **Gaps in the planned tests** (§6), especially the RLS matrix probes with forged `aal1`/`aal2` claims.

Rules:
- Report only real, specific design problems. For each: **severity** (BLOCKER / CRITICAL / HIGH / MEDIUM / LOW / NIT),
  **section of the proposal**, **what is wrong**, a **concrete attack or failure scenario**, and a **suggested design
  change**.
- If something depends on Supabase behaviour that cannot be verified from the repository, mark it UNVERIFIED and say
  what the Builder's spike (§8 step 0) must prove.
- End with one line: `THREAT-MODEL REVIEW RESULT: PASS` (no BLOCKER/CRITICAL/HIGH) or `THREAT-MODEL REVIEW RESULT:
  FAIL`, and the commit SHA you reviewed.

---

Afterwards, paste the findings to the Builder. BLOCKER/CRITICAL/HIGH change the design before coding;
MEDIUM/LOW/NIT go into `.ai/DECISIONS.md` or are folded into the design.
