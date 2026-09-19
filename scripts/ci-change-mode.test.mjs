import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyEvent,
  classifyRecords,
  isDocumentationPath,
  parseNameStatus,
  selectDiffRange,
  selectSuccessfulPredecessorRun,
} from './ci-change-mode.mjs';

const BASE = '1'.repeat(40);
const HEAD = '2'.repeat(40);
const BEFORE = '3'.repeat(40);

function opened(diffText, overrides = {}) {
  return classifyEvent({
    eventName: 'pull_request',
    action: 'opened',
    baseSha: BASE,
    headSha: HEAD,
    diffText,
    ...overrides,
  });
}

function sync(diffText, overrides = {}) {
  return classifyEvent({
    eventName: 'pull_request',
    action: 'synchronize',
    baseSha: BASE,
    headSha: HEAD,
    eventBefore: BEFORE,
    eventAfter: HEAD,
    diffText,
    ...overrides,
  });
}

test('documentation allowlist accepts only intended Markdown paths', () => {
  assert.equal(isDocumentationPath('README.md'), true);
  assert.equal(isDocumentationPath('.ai/tasks/example.md'), true);
  assert.equal(isDocumentationPath('docs/example.md'), true);
  assert.equal(isDocumentationPath('docs\\example.md'), true);
  assert.equal(isDocumentationPath('.ai/example.yml'), false);
  assert.equal(isDocumentationPath('nested/README.md'), false);
  assert.equal(isDocumentationPath('docs/example.MD'), false);
});

test('opened docs-only PR uses cumulative scope without predecessor', () => {
  const result = opened('M\tREADME.md\n');
  assert.equal(result.mode, 'DOCS_ONLY');
  assert.equal(result.scope, 'cumulative-pr');
  assert.equal(result.requiresPredecessor, false);
  assert.equal(result.startSha, BASE);
  assert.equal(result.endSha, HEAD);
});

test('reopened docs-only PR uses cumulative scope without predecessor', () => {
  const result = classifyEvent({
    eventName: 'pull_request',
    action: 'reopened',
    baseSha: BASE,
    headSha: HEAD,
    diffText: 'M\tdocs/example.md\n',
  });
  assert.equal(result.mode, 'DOCS_ONLY');
  assert.equal(result.scope, 'cumulative-pr');
  assert.equal(result.requiresPredecessor, false);
});

test('synchronize docs-only delta requires predecessor continuity', () => {
  const result = sync('M\t.ai/tasks/example.md\n');
  assert.equal(result.mode, 'DOCS_ONLY');
  assert.equal(result.scope, 'synchronize-delta');
  assert.equal(result.startSha, BEFORE);
  assert.equal(result.endSha, HEAD);
  assert.equal(result.requiresPredecessor, true);
  assert.equal(result.predecessorSha, BEFORE);
});

test('synchronize non-doc delta remains FULL and needs no predecessor', () => {
  const result = sync('M\tlib/example.ts\n');
  assert.equal(result.mode, 'FULL');
  assert.equal(result.scope, 'synchronize-delta');
  assert.equal(result.requiresPredecessor, false);
  assert.equal(result.predecessorSha, null);
});

test('synchronize missing event SHAs fails closed FULL', () => {
  const result = sync('M\tREADME.md\n', { eventBefore: '' });
  assert.equal(result.mode, 'FULL');
  assert.equal(result.reason, 'missing-or-invalid-synchronize-sha');
});

test('synchronize after/head mismatch fails closed FULL', () => {
  const result = sync('M\tREADME.md\n', { eventAfter: '4'.repeat(40) });
  assert.equal(result.mode, 'FULL');
  assert.equal(result.reason, 'synchronize-after-head-mismatch');
});

test('unsupported PR action fails closed FULL', () => {
  const result = classifyEvent({
    eventName: 'pull_request',
    action: 'edited',
    baseSha: BASE,
    headSha: HEAD,
    diffText: 'M\tREADME.md\n',
  });
  assert.equal(result.mode, 'FULL');
  assert.match(result.reason, /^unsupported-pr-action:/);
});

test('root README.md is DOCS_ONLY', () => assert.equal(opened('M\tREADME.md\n').mode, 'DOCS_ONLY'));
test('.ai Markdown is DOCS_ONLY', () => assert.equal(opened('M\t.ai/tasks/example.md\n').mode, 'DOCS_ONLY'));
test('docs Markdown is DOCS_ONLY', () => assert.equal(opened('A\tdocs/example.md\n').mode, 'DOCS_ONLY'));
test('.ai YAML is FULL', () => assert.equal(opened('M\t.ai/example.yml\n').mode, 'FULL'));
test('workflow change is FULL', () => assert.equal(opened('M\t.github/workflows/ci.yml\n').mode, 'FULL'));

test('package and lock changes are FULL', () => {
  assert.equal(opened('M\tpackage.json\n').mode, 'FULL');
  assert.equal(opened('M\tpackage-lock.json\n').mode, 'FULL');
});

test('script/source/test/Supabase changes are FULL', () => {
  assert.equal(opened('M\tscripts/example.mjs\n').mode, 'FULL');
  assert.equal(opened('M\tlib/example.ts\n').mode, 'FULL');
  assert.equal(opened('M\ttests/example.test.ts\n').mode, 'FULL');
  assert.equal(opened('A\tsupabase/migrations/example.sql\n').mode, 'FULL');
});

test('mixed docs and non-doc change is FULL', () => {
  assert.equal(opened('M\tREADME.md\nM\tlib/example.ts\n').mode, 'FULL');
});

test('deletion of non-doc is FULL', () => assert.equal(opened('D\tlib/example.ts\n').mode, 'FULL'));

test('rename from non-doc into docs is FULL when diff is rename-disabled', () => {
  assert.equal(opened('D\tlib/example.ts\nA\tdocs/example.md\n').mode, 'FULL');
});

test('malformed or unknown status is FULL', () => {
  assert.equal(opened('R100\tlib/a.ts\tdocs/a.md\n').mode, 'FULL');
  assert.equal(opened('Q\tdocs/a.md\n').mode, 'FULL');
});

test('empty change evidence is FULL', () => assert.equal(opened('').mode, 'FULL'));

test('classifier error is FULL', () => {
  const result = opened('', { diffError: 'simulated git failure' });
  assert.equal(result.mode, 'FULL');
  assert.match(result.reason, /^classifier-error:/);
});

test('manual dispatch is always FULL', () => {
  const result = classifyEvent({
    eventName: 'workflow_dispatch',
    action: '',
    baseSha: '',
    headSha: '',
    diffText: '',
  });
  assert.equal(result.mode, 'FULL');
  assert.equal(result.reason, 'manual-dispatch');
});

test('missing or invalid PR SHAs are FULL', () => {
  assert.equal(opened('M\tREADME.md\n', { baseSha: '' }).mode, 'FULL');
  assert.equal(opened('M\tREADME.md\n', { headSha: 'not-a-sha' }).mode, 'FULL');
});

test('parser rejects traversal and malformed paths', () => {
  assert.equal(parseNameStatus('M\t../README.md\n').ok, false);
  assert.equal(parseNameStatus('M\tdocs//README.md\n').ok, false);
});

test('record classifier fails closed on malformed record arrays', () => {
  assert.equal(classifyRecords([]).mode, 'FULL');
  assert.equal(classifyRecords([{ status: 'Q', path: 'README.md' }]).mode, 'FULL');
});

test('selectDiffRange exposes exact synchronize delta', () => {
  const range = selectDiffRange({
    eventName: 'pull_request',
    action: 'synchronize',
    baseSha: BASE,
    headSha: HEAD,
    eventBefore: BEFORE,
    eventAfter: HEAD,
  });
  assert.equal(range.scope, 'synchronize-delta');
  assert.equal(range.startSha, BEFORE);
  assert.equal(range.endSha, HEAD);
  assert.equal(range.requiresPredecessor, true);
});

test('predecessor selector accepts successful same-PR same-head run', () => {
  const run = selectSuccessfulPredecessorRun([
    {
      id: 100,
      run_number: 50,
      name: 'Foundation CI',
      event: 'pull_request',
      status: 'completed',
      conclusion: 'success',
      head_sha: BEFORE,
      pull_requests: [{ number: 5 }],
    },
  ], { predecessorSha: BEFORE, prNumber: 5 });
  assert.equal(run?.id, 100);
});

test('predecessor selector rejects failed, wrong-head, and wrong-PR runs', () => {
  const runs = [
    { id: 1, run_number: 1, name: 'Foundation CI', event: 'pull_request', status: 'completed', conclusion: 'failure', head_sha: BEFORE, pull_requests: [{ number: 5 }] },
    { id: 2, run_number: 2, name: 'Foundation CI', event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: HEAD, pull_requests: [{ number: 5 }] },
    { id: 3, run_number: 3, name: 'Foundation CI', event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: BEFORE, pull_requests: [{ number: 99 }] },
  ];
  assert.equal(selectSuccessfulPredecessorRun(runs, { predecessorSha: BEFORE, prNumber: 5 }), null);
});

test('predecessor selector chooses newest successful matching run', () => {
  const runs = [
    { id: 10, run_number: 10, name: 'Foundation CI', event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: BEFORE, pull_requests: [{ number: 5 }] },
    { id: 11, run_number: 12, name: 'Foundation CI', event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: BEFORE, pull_requests: [{ number: 5 }] },
  ];
  assert.equal(selectSuccessfulPredecessorRun(runs, { predecessorSha: BEFORE, prNumber: 5 })?.id, 11);
});
