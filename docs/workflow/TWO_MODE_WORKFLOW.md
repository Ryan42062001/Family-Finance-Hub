# Two-mode workflow: Claude credits vs ChatGPT (Ryan, 2026-11-14)

Goal: work never stalls when Claude credits run out. ChatGPT regular chats are free and unlimited for Ryan; only
ChatGPT **Work mode** (the Cloud Browser) uses ChatGPT credits. The repository is the shared memory: whoever builds
reads and updates the same files, follows the same approval table (`docs/WORKFLOW.md`) and never relies on chat
history.

## Who does what

| Job | Mode A: Claude has credits | Mode B: Claude is out of credits |
|---|---|---|
| **Builder** (code, tests, CI, PRs, phase-branch merges) | Claude Code | ChatGPT regular chat, with the GitHub connector, using `docs/workflow/CHATGPT_BUILDER_PROMPT.md` |
| **Independent reviewer** (HIGH-risk phases and fixes) | ChatGPT regular chat (free) | A **different, fresh** ChatGPT chat than the builder chat. Or hold the review until Claude is back and let Claude review ChatGPT's work |
| **Browser QA** | ChatGPT Work mode, **only** when screens changed | Same. Skip it if Work mode credits are low; the automated `e2e-isolation` job already checks sign-in and household isolation on every phase push |
| **Ryan** | Decisions, hosted Supabase/Vercel steps, release approval | Same |

Rules for both builders:

- Use the approval table in `docs/WORKFLOW.md` exactly. Pushing your own branch and opening PRs needs no approval.
  A push builds a Vercel **Preview only**, never Production. Merging into `main`, hosted Supabase/Vercel changes,
  secrets and real data still need Ryan, explicitly, every time.
- **Push normally; don't park work in detached commits.** Claude uses `claude/...` branches; ChatGPT uses
  `chatgpt/<short-topic>` branches. Only one builder works on a branch at a time.
- **CI is the test runner.** If you can't run `npm run verify` yourself, push and read CI (`fast`, `rls-matrix`,
  `e2e-isolation`). Never report a check as passing without its run link.
- Schema changes: never guess `scripts/rls-local/parity.expected.txt`. Push, take the fingerprint CI prints, and
  commit it.
- Hosted SQL for Ryan: a function body copied from a browser on Windows picks up CRLF line endings. Always include
  the `pg_get_functiondef` + `replace(…, E'\r', '')` clean-up step (see FFH-P05/P06 in `.ai/DECISIONS.md`), then run
  `parity.sql`.

## Switching modes (the handoff)

**Whoever stops** (Claude running low, or ChatGPT finishing a session) updates `.ai/HANDOFF.md` and pushes it:
current phase and branch, the last commit and CI result, what is half-done, the very next step, and anything waiting
on Ryan. Keep it to about 15 lines. It replaces long PR comments.

**Whoever starts** reads, in order: `AGENTS.md`, `.ai/HANDOFF.md`, `.ai/CURRENT_PHASE.md`, then the phase PR's latest
comments and open `qa-finding` issues. Repository evidence beats chat memory.

Ryan's part when switching:

- **Claude → ChatGPT:** open a new ChatGPT chat, paste `docs/workflow/CHATGPT_BUILDER_PROMPT.md`, and say what to
  do next (usually "continue from HANDOFF").
- **ChatGPT → Claude:** tell Claude "I continued with ChatGPT". Claude reads HANDOFF and the PR, checks ChatGPT's work,
  and continues.

## Saving credits

- **Claude:** batch decisions into one question; avoid many small "check again" turns; skip screenshots unless a
  screen changed.
- **Work mode:** only for new or changed screens, with a focused check list (not the full checklist). Phases with no
  screen changes skip it.
- **Reviews** always go to free ChatGPT chats.
