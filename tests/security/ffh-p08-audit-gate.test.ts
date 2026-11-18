import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error plain ESM script without type declarations
import { evaluate, parseExceptions, advisoriesOf } from "../../scripts/audit-gate.mjs";

const PICO = "GHSA-fc5q-39xc-vjpf";
const OTHER = "GHSA-g3hv-75wg-m249";
const url = (id: string) => `https://github.com/advisories/${id}`;
const empty = { auditReportVersion: 2, vulnerabilities: {} };
const exceptions = parseExceptions({
  exceptions: [{ ghsa: PICO, package: "picomatch", expires: "2027-01-18", reason: "dev-only, no patch" }],
});

function report(entries: Record<string, { severity: string; via: unknown[] }>) {
  return { auditReportVersion: 2, vulnerabilities: entries };
}
const pico = (severity = "high") => report({
  picomatch: { severity, via: [{ name: "picomatch", severity, url: url(PICO) }] },
  micromatch: { severity, via: ["picomatch"] },
  "eslint-config-next": { severity, via: ["micromatch"] },
});
const run = (full: unknown, prod: unknown = empty, today = "2026-11-18") => evaluate({ full, prod, exceptions, today });

test("FFH-P08 audit gate passes only the excepted dev-only HIGH advisory", () => {
  const result = run(pico());
  assert.equal(result.ok, true, result.failures.join("; "));
  assert.equal(run(empty).ok, true);
});

test("FFH-P08 audit gate fails any other HIGH or CRITICAL advisory", () => {
  for (const severity of ["high", "critical"]) {
    const full = report({ ...pico().vulnerabilities, minimatch: { severity, via: [{ name: "minimatch", severity, url: url(OTHER) }] } });
    assert.equal(run(full).ok, false, severity);
  }
  const noId = report({ x: { severity: "high", via: [{ name: "x", severity: "high", url: "https://example.invalid/x" }] } });
  assert.equal(run(noId).ok, false);
});

test("FFH-P08 audit gate keeps the HIGH threshold: moderate and low do not fail", () => {
  const full = report({ minimatch: { severity: "moderate", via: [{ name: "minimatch", severity: "moderate", url: url(OTHER) }] } });
  assert.equal(run(full).ok, true);
});

test("FFH-P08 audit exception does not cover a different package, critical severity, expiry or production reach", () => {
  const otherPkg = report({ fdir: { severity: "high", via: [{ name: "fdir", severity: "high", url: url(PICO) }] } });
  assert.equal(run(otherPkg).ok, false, "same GHSA on another package");
  assert.equal(run(pico("critical")).ok, false, "upgraded to critical");
  assert.equal(run(pico(), empty, "2027-01-18").ok, true, "last valid day");
  assert.equal(run(pico(), empty, "2027-01-19").ok, false, "expired");
  const prodModerate = report({ picomatch: { severity: "moderate", via: [{ name: "picomatch", severity: "moderate", url: url(PICO) }] } });
  assert.equal(run(pico(), prodModerate).ok, false, "advisory reaches production at any severity");
  assert.equal(run(empty, pico()).ok, false, "production HIGH is never excepted");
});

test("FFH-P08 audit gate fails closed on unreadable npm output and malformed exceptions", () => {
  for (const bad of [null, {}, { auditReportVersion: 1, vulnerabilities: {} }, { auditReportVersion: 2 },
    { auditReportVersion: 2, vulnerabilities: {}, error: { code: "ENOAUDIT" } },
    report({ x: { severity: "high", via: [] } }), report({ x: { severity: "high", via: [null] } })]) {
    assert.throws(() => advisoriesOf(bad));
  }
  for (const bad of [{}, { exceptions: [{ ghsa: "GHSA-xxxx", package: "picomatch", expires: "2027-01-18", reason: "r" }] },
    { exceptions: [{ ghsa: PICO, package: "", expires: "2027-01-18", reason: "r" }] },
    { exceptions: [{ ghsa: PICO, package: "picomatch", expires: "soon", reason: "r" }] },
    { exceptions: [{ ghsa: PICO, package: "picomatch", expires: "2027-01-18" }] }]) {
    assert.throws(() => parseExceptions(bad));
  }
});

test("FFH-P08 checked-in exceptions are exactly the one approved, time-limited advisory", () => {
  const raw = JSON.parse(readFileSync(new URL("../../scripts/audit-exceptions.json", import.meta.url), "utf8"));
  const list = parseExceptions(raw);
  assert.deepEqual(list, [{ ghsa: PICO, package: "picomatch", expires: "2027-01-18" }]);
});

test("FFH-P08 CI runs the audit gate in fast and full-phase and no longer relies on a bare npm audit", () => {
  const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.equal(ci.match(/- run: node scripts\/audit-gate\.mjs$/gm)?.length, 2);
  assert.doesNotMatch(ci, /npm audit --audit-level=(low|moderate|critical)|continue-on-error/);
  const gate = readFileSync(new URL("../../scripts/audit-gate.mjs", import.meta.url), "utf8");
  assert.match(gate, /'--omit=dev'/);
  assert.match(gate, /new Set\(\['high', 'critical'\]\)/);
});
