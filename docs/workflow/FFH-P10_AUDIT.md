# FFH-P10 independent audit receipt

- **Reviewer:** a different model from the Builder (ChatGPT), end-of-phase HIGH-risk audit, prompt per
  `docs/workflow/REVIEW_PROMPT.md` with the P10 focus list (pasted by Ryan, 2026-11-19).
- **Scope:** `83979c1c9e3b6f2e6ac1f26f3d5643c8f98061db...865783a5d66625fe1b983772fafba0623d0c4998` (phase PR #189: #190,
  #191 and the P09 close-out carried from #187).
- **Result:** `REVIEW RESULT: FAIL — 865783a5d66625fe1b983772fafba0623d0c4998`. 2 HIGH, 3 MEDIUM. The reviewer found the
  problems in the guided-input contract, not in the canonical evaluators.
- **Verified by the reviewer:** canonical Home/Vehicle evaluators unchanged and called through the existing adapters;
  deep-equivalence tests; server-resolved household authority; forged/unknown keys and stale baselines refused; P08
  session/two-factor gates cover the new routes; read-only (no writes); two-option independence; P09 monthly
  equivalents consumed once; 20/3/8 and vehicle-value boundaries; incomplete gross income → insufficient information;
  navigation/Simple mode; hosted-apply rehearsal; guideline sources and nonbinding labelling; exact-head CI
  44456796889 (and 44456809830) green incl. e2e 58/58.
- **UNVERIFIED by the reviewer:** hosted browser interactions and hosted Supabase (not queried); phone-width QA parts are
  Ryan's device checks.

## Findings and disposition

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| P10-01 | HIGH | The Home form pre-selected "Yes, it ends", so an unanswered question removed the current housing payment from the projected monthly cost. | **Fixed:** no choice is pre-answered (rate type, balloon, balance can grow, mortgage insurance, payment ends, vehicle reason; the 30-year term prefill is removed). A blank choice is refused before evaluation. Tests: blank refused; explicit No keeps the current payment (incremental cost = all-in cost). |
| P10-02 | HIGH | A blank maintenance set-aside could still give a positive canonical verdict (the evaluator only flags it when the margin is thin). | **Fixed in the P10 input contract** (evaluator unchanged): maintenance is required; 0 only when entered deliberately. Test proves the unguarded evaluator returns a positive verdict for the scenario and that P10 now refuses it. |
| P10-03 | MEDIUM | Mortgage insurance defaulted to None. | **Fixed:** explicit choice required, with **Not sure yet**, which keeps the amount unknown (evaluator reports it missing → more information needed). Test added. |
| P10-04 | MEDIUM | 36% counted a recorded mortgage that the purchase may replace and still gave a definitive status. | **Fixed:** Insufficient information in that case, naming the unknown (whether the mortgage is paid off), with both ratios shown for context only. Test added. |
| P10-05 | MEDIUM | Emergency guideline reported a breach whenever protected cash was needed, without knowing the reserve left. | **Fixed:** Insufficient information, explaining that the purchase draws on protected money; "outside guideline" only when the post-purchase reserve is known to be below the target. Test updated. |

Targeted re-check of P10-01 and P10-02 (and confirmation of P10-03–05) is requested at the new frozen candidate.
