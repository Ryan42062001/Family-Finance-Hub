# Progress-First Feature Delivery, Phase Audits and Final Audit Policy

## Product Owner directive — 2026-11-07 (refined)

**BUILD → SHORT PHASE/MAJOR-FEATURE AUDIT → FIX BLOCKER/CRITICAL/HIGH → CONTINUE BUILDING → ONE COMPREHENSIVE FINAL AUDIT & REMEDIATION → RELEASE.** Deliver working functionality without repeatedly holding unrelated features hostage to exhaustive architecture review campaigns. A small scoped independent audit still happens at the end of every coherent phase or major feature, before declaring it accepted or requesting its merge. The broad cross-project audit and cleanup are reserved for the integrated release candidate. This is a sequencing decision, NOT permission to declare unverified evidence PASS or bypass a real security gate.

### Phase/major-feature exit — required SHORT independent audit

1. Builder provides exact PR/commit SHA, changed-file inventory, actual passing CI/test evidence, safe preview/Owner product feedback, and known unverified boundaries. Use one branch and one draft PR per coherent phase; regular Chat is the default Builder environment.
2. One **fresh independent auditor** (not the Builder) conducts a **bounded changed-scope audit**: newly touched code, security/data ownership around touched paths, calculations, significant dependency changes, regression hazards, explicit stop conditions and current evidence. Record the audit's exact SHA, findings and severity. This is NOT a repeat of the entire system audit, not a months-long design campaign, and never a substituted assumed PASS.
3. **BLOCKER / CRITICAL / HIGH**: stop the *affected* merge, deployment or use; fix now, rerun relevant CI and have the independent auditor conduct a *targeted* re-audit against the new exact SHA. A known exploitable high-risk boundary, secret leak, severe financial/health integrity defect, destructive data risk or live incident is not deferrable. Unrelated safe development may continue separately.
4. **MEDIUM / LOW / NIT only**: no routine immediate remediation campaign required. Record each finding in the **final-audit backlog** with severity, exact source/PR/SHA, explanation, impact/conditions, suggested fix, responsible phase and priority. Continue after CI, scoped-audit completion, Product Owner preview and explicit merge permission. Escalate an issue to HIGH immediately if investigation shows substantial confidentiality, integrity, availability or real-money/live-user consequences; do not underclassify to make progress.
5. **No substantive findings**: close the short audit and proceed to the next feature, subject to normal tests, Owner merge permission and production rules. Previous results are not retroactively upgraded; a missing/failed critical test stays unverified/blocked for that affected path.
6. Audit timebox means **narrow scope**, not fabricated evidence or pressure to ignore a genuine security defect. If a required live boundary cannot be safely verified, keep that path parked and disclose it; do not run dangerous tests or delay unrelated feature work.

### Two honest, independent progress ledgers

- **Feature delivery**: NOT_STARTED → BUILDING → FUNCTIONALLY_VALIDATED → PHASE_AUDIT_REVIEWED → OWNER_PREVIEW_ACCEPTED → FEATURE_ACCEPTED_PENDING_FINAL_AUDIT. Measure completed capabilities with actual behavior/persistence and test evidence, not number of PRs or screenshots. Honor per-repository CLOSED criteria; never call unmerged/blocked code CLOSED to increase the percentage.
- **Audit/release**: PHASE_AUDIT_PENDING / PHASE_AUDIT_PASS_OR_NONHIGH_OPEN / BLOCKER_CRITICAL_HIGH_OPEN / DEFERRED_MEDIUM_LOW_NIT / FINAL_AUDIT_PENDING / REMEDIATING / RE_AUDITED_PASS / RELEASE_AUTHORIZED. Keep immutable old failures, open tickets, and evidence links. "Passed the small audit with non-high findings" is not the same as no findings or final security clearance.

### Development safeguards never deferred

Keep scoped functional/unit/integration testing, lint/typecheck/FAST CI, safe user previews, validation and server-derived identity/owner isolation, privacy constraints, safe migration plans, exact-head evidence, protected branch checks and explicit Owner merge permission. Any significant new role, grant, secrets use, destructive schema migration, live provider operation, cost or production deployment still requires its normal distinct Owner authority. Use synthetic/sanitized data wherever required. A real high/critical defect must be fixed or isolated before the affected functionality is used; do not hide it under an audit backlog.

Old workflow sections demanding a full independent **phase-wide** freeze, exhaustive audit and cleanup after every small feature are modified **only as to breadth/timing** by this owner amendment once merged. Continue the one short independent phase/major-feature audit and focused blocker remediation; if automated contract validators need adjustment, update in a separately reviewed change, without forging PASS or silently disabling CI.

### One comprehensive final audit, remediation and targeted re-audit

After planned features integrate, freeze an exact-SHA candidate and run one genuinely **independent whole-product review** of functionality, security/privacy/auth/RLS and cross-owner boundaries, calculations/data integrity, stored files/backups and deletion, secrets, dependency/supply chain, deployment/incident readiness, accessibility and regressions, including the entire documented non-high backlog and all historical open high-risk matters. Batch-fix findings; rerun scoped and full CI/Owner checks; freeze a fresh exact SHA and independently re-audit remediated and high-risk affected paths. The final candidate must have **zero unresolved BLOCKER/CRITICAL/HIGH**, and other findings must have an explicit review/disposition appropriate to the release contract. Product Owner separately authorizes production/private beta/season release and any required merge/deployment. Neither a family-only application nor a public existing website excuses known unsafe behavior.

### Project-specific application

**Product:** Private household finance planning and decision support.

**Retained non-negotiable boundary:** No real household financial data in GitHub, fixtures, logs or public preview; no unauthorized Supabase schema/RLS changes, credential access or production/Private Beta. Ownership/RLS, money movement or priority calculations, source inputs and destructive paths must fail closed; investigate or isolate any known exploitable cross-household exposure immediately.

**Practical next feature sequence:** Continue the FFH product backlog on separate feature branches while existing FFH-P01 PR #81 release-readiness/HIGH blockers remain held; no release-readiness PASS or bypass of prior independent findings.

**Final-release gate:** The next private household/beta production launch, gated on comprehensive independent security/data-integrity and money-calculation audit, remediation, re-audit and explicit owner approval.

**Authority precedence:** This is the Owner's new sequencing choice. Once merged, it supersedes only conflicting *timing* language in the existing per-phase audit flow; all unrelated security, exact-SHA, release, provider and payment constraints remain effective. Earlier failed audit records remain immutable evidence. A draft PR alone does not change the protected default branch.
