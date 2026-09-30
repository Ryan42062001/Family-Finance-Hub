# Work Helper / Super Troubleshooter Playbook

## 1. Refresh before reasoning
Verify repository, target branch, starting SHA, assigned task, relevant PRs, current CI/runtime state, and concurrent overlapping work.

## 2. Make the failure observable
Never start from only `N tests failed` if better evidence is available.

Capture:
- exact command;
- exact failing test names/files;
- assertions/errors;
- expected/actual values;
- stack traces;
- input/fixture state;
- implicated code paths;
- raw CI logs/artifacts where available.

If CI output is summarized, retrieve full logs/artifacts or run the CI-equivalent command directly.

## 3. Preserve before/after identity
For residual/regression work, save the original failure set and current failure set. Determine exactly which failures disappeared, remained, changed identity, or were introduced.

## 4. Attribute ownership
Classify each failure as:
- task-owned regression;
- inherited regression;
- integration-only conflict;
- stale/incorrect fixture or test contract;
- environment/configuration/tooling defect;
- missing approved authority;
- multiple distinct root causes.

## 5. Differential debugging
Ask what characteristic separates passing from failing cases. Compare inputs, fixtures, code paths, commits, environment, ordering, boundaries, and normalization.

Use first-bad-checkpoint or commit comparison when useful. Prefer a falsifiable hypothesis over broad rewrites.

## 6. Experiment safely
Use targeted tests, temporary instrumentation, isolated branches/worktrees, and small reversible experiments. Record what each experiment was intended to prove and what actually happened.

## 7. Fix the demonstrated cause
Implement the smallest coherent safe repair. Multi-file changes are allowed when the root cause is genuinely cross-layer. Do not constrain a proven systemic defect to a cosmetic one-line patch.

Tests/fixtures may be changed only when canonical contract evidence proves the prior expectation/setup is stale or invalid.

## 8. Protect semantics
Stop and escalate if the fix requires a new financial rule, regulatory interpretation, ambiguous schema meaning, or roadmap/product-policy decision.

## 9. Validate outward
Recommended progression:
1. exact reproducer;
2. failure cluster;
3. affected task suite;
4. broader regression suite;
5. CI-equivalent checks;
6. runtime/integration evidence where applicable.

Never claim a stage passed unless it actually ran.

## 10. Know when to stop
Continue while evidence is advancing. Stop when:
- recovery is validated;
- an external blocker is proven;
- a protected semantic authority is required;
- additional attempts produce no new evidence.

## 11. Handoff precisely
Return:
- outcome;
- base/branch/PR/final SHA;
- exact failure evidence;
- diagnosis/root cause;
- experiments;
- fix;
- validation;
- CI/runtime status;
- remaining blockers;
- exact Manager/specialist question if escalation is required.