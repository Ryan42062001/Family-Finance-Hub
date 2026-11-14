# Current phase

FFH-P06 — Household invitations

State: BUILDING
Risk: HIGH (adds people to a household: membership, roles and RLS)
Owner: Ryan
Phase branch / PR: `phase/ffh-p06-household-invitations` → `main`

Merging this phase into `main` is a Production release (Vercel auto-deploys `main`); it needs Ryan's explicit release
approval, the release checklist in `docs/WORKFLOW.md`, and a Production smoke test right after. Production deployment is
not authorized by anything else in this phase.

## Goal

Let a household owner invite another person (for example a spouse or partner) to join their household, using the
existing owner / member / viewer roles, so a family can plan together without sharing one login.

## Scope (roadmap item 4)

- An owner creates an invitation for a chosen role (member or viewer) and shares it; the invited person signs in or
  signs up and accepts it, and only then becomes a household member.
- Owners can see pending invitations and cancel them, and can change or remove a member's role.
- Membership changes are migrations with RLS in a reviewed PR, covered by new RLS matrix probes (nobody can join a
  household without a valid invitation; invitations cannot be read, used or forged across households; viewers stay
  read-only).
- QA checklist and the automated isolation check updated for the new screens.

## Decisions (Ryan, 2026-11-13)

- Invitations are a link the owner copies and sends themselves (no app email yet).
- An invitation is valid for 7 days and can be used once.
- Only the household owner can invite, change roles or remove people. The owner can never be demoted or removed.

## Design

- `household_invitations` (owner-only RLS): role (member or viewer), optional label (for example "Jordan"), a SHA-256
  hash of the secret link token (the token itself is never stored), 7-day expiry, and who accepted. Owners can create,
  see and cancel (delete) their household's pending invitations.
- Membership changes go only through narrow SECURITY DEFINER functions (`search_path = ''`, EXECUTE for authenticated
  only): accept an invitation (valid, unused, unexpired; locked so it is used once; the person must not already belong
  to a household), set a member's role (owner only; never the owner), remove a member (owner only; never the owner).
  Direct writes to `household_members` stay forbidden.
- No sign-in changes: an invite link opened while signed out is remembered in a short-lived httpOnly cookie, and the
  "create your household" screen then offers to join instead.

## Out of scope / boundaries

- No change to money calculations. Synthetic data only.

## Done when

- CI green (`fast`, `rls-matrix`, `e2e-isolation`); `npm run verify` passes; the RLS matrix covers invitations.
- Work mode QA on the Preview for the new screens, and independent review by a different model (ChatGPT).
- Any hosted migration applied with Ryan's authorization and hosted parity matching.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
