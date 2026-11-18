#!/usr/bin/env node
// FFH-P08 dependency audit gate (Ryan, 2026-11-18, option 2 in docs/workflow/FFH-P08_DEPENDENCY_AUDIT.md).
//
// Same threshold as `npm audit --audit-level=high`: any HIGH or CRITICAL advisory fails, with one narrow exception
// mechanism. An advisory listed in scripts/audit-exceptions.json is tolerated only when ALL of these hold:
//   - its GHSA id and package name both match an entry, and its severity is exactly "high" (never critical);
//   - the entry's review date (`expires`, YYYY-MM-DD, UTC) has not passed;
//   - the production-only audit (`npm audit --omit=dev`) reports no HIGH/CRITICAL at all and does not contain that
//     advisory at any severity (i.e. it is reachable only through dev dependencies).
// Anything unexpected (unreadable npm output, an npm error, malformed exceptions) fails closed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GATED = new Set(['high', 'critical']);
const GHSA = /^GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}$/;

function ghsaOf(advisory) {
  const match = typeof advisory.url === 'string' ? advisory.url.match(/\/advisories\/(GHSA-[a-z0-9-]+)$/) : null;
  return match ? match[1] : null;
}

// Every advisory object npm attaches directly to a package. String `via` entries only point at other packages whose
// own advisories are listed here too, so a package's severity always derives from one of these objects.
export function advisoriesOf(report) {
  if (!report || typeof report !== 'object' || report.auditReportVersion !== 2 || report.error) {
    throw new Error('npm audit output is not a readable version-2 report');
  }
  if (!report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
    throw new Error('npm audit report has no vulnerabilities section');
  }
  const out = [];
  for (const [pkg, entry] of Object.entries(report.vulnerabilities)) {
    if (!entry || !Array.isArray(entry.via)) throw new Error('npm audit report entry is malformed');
    if (GATED.has(entry.severity) && !entry.via.length) throw new Error('gated entry without a source');
    for (const via of entry.via) {
      if (typeof via === 'string') continue;
      if (!via || typeof via !== 'object') throw new Error('npm audit advisory is malformed');
      out.push({ package: via.name ?? pkg, severity: via.severity, ghsa: ghsaOf(via) });
    }
  }
  return out;
}

export function parseExceptions(raw) {
  if (!raw || !Array.isArray(raw.exceptions)) throw new Error('audit exceptions file is malformed');
  return raw.exceptions.map((e) => {
    if (!e || !GHSA.test(e.ghsa ?? '') || typeof e.package !== 'string' || !e.package
      || !/^\d{4}-\d{2}-\d{2}$/.test(e.expires ?? '') || typeof e.reason !== 'string' || !e.reason) {
      throw new Error('audit exception entry is malformed');
    }
    return { ghsa: e.ghsa, package: e.package, expires: e.expires };
  });
}

export function evaluate({ full, prod, exceptions, today }) {
  const failures = [];
  const notes = [];
  const prodAdvisories = advisoriesOf(prod);
  const fullAdvisories = advisoriesOf(full);
  const prodGhsas = new Set(prodAdvisories.map((a) => a.ghsa));

  for (const a of prodAdvisories) {
    if (GATED.has(a.severity)) failures.push(`production dependency advisory ${a.ghsa ?? 'without GHSA id'} (${a.severity}) in ${a.package}`);
  }

  const used = new Set();
  const matched = new Set();
  for (const a of fullAdvisories) {
    if (!GATED.has(a.severity)) continue;
    const match = exceptions.find((e) => e.ghsa === a.ghsa && e.package === a.package);
    if (!match) { failures.push(`advisory ${a.ghsa ?? 'without GHSA id'} (${a.severity}) in ${a.package}`); continue; }
    matched.add(match.ghsa);
    if (a.severity !== 'high') { failures.push(`excepted advisory ${a.ghsa} is now ${a.severity}`); continue; }
    if (today > match.expires) { failures.push(`exception for ${a.ghsa} expired on ${match.expires}; re-review it`); continue; }
    if (prodGhsas.has(a.ghsa)) { failures.push(`excepted advisory ${a.ghsa} reaches a production dependency`); continue; }
    used.add(match.ghsa);
  }
  for (const e of exceptions) {
    if (!matched.has(e.ghsa)) notes.push(`exception ${e.ghsa} no longer matches anything; remove it`);
    else if (used.has(e.ghsa)) notes.push(`tolerated dev-only ${e.ghsa} in ${e.package} until ${e.expires}`);
  }
  return { ok: failures.length === 0, failures: [...new Set(failures)], notes };
}

function runAudit(args) {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
    if (error && typeof error.stdout === 'string' && error.stdout.trim()) return JSON.parse(error.stdout);
    throw new Error('npm audit did not produce a report');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const exceptions = parseExceptions(JSON.parse(readFileSync(new URL('./audit-exceptions.json', import.meta.url), 'utf8')));
    const result = evaluate({
      full: runAudit([]),
      prod: runAudit(['--omit=dev']),
      exceptions,
      today: new Date().toISOString().slice(0, 10),
    });
    for (const note of result.notes) console.log(`audit-gate: ${note}`);
    for (const failure of result.failures) console.error(`audit-gate: FAIL ${failure}`);
    console.log(result.ok ? 'audit-gate: PASS' : 'audit-gate: FAIL');
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(`audit-gate: FAIL ${error instanceof Error ? error.message : 'unexpected error'}`);
    process.exit(1);
  }
}
