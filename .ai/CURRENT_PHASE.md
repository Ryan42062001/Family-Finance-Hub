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

## Open questions for Ryan (settle before building)

- How is an invitation delivered: a link the owner copies and sends themselves (works now), or an email from the app
  (email deliverability is still an open backlog item)?
- How long should an invitation stay valid, and can it be used only once?
- Can a member (not only the owner) invite people?

## Out of scope / boundaries

- No change to money calculations. Synthetic data only.

## Done when

- CI green (`fast`, `rls-matrix`, `e2e-isolation`); `npm run verify` passes; the RLS matrix covers invitations.
- Work mode QA on the Preview for the new screens, and independent review by a different model (ChatGPT).
- Any hosted migration applied with Ryan's authorization and hosted parity matching.
- Ryan approves the release; the Builder merges into `main`, then the Production smoke test passes 12/12.
