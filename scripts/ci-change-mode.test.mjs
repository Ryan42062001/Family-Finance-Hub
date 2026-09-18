import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyEvent,
  classifyRecords,
  isDocumentationPath,
  parseNameStatus,
} from './ci-change-mode.mjs';

const BASE = '1'.repeat(40);
const HEAD = '2'.repeat(40);

function classify(diffText, overrides = {}) {
  return classifyEvent({
    eventName: 'pull_request',
    baseSha: BASE,
    headSha: HEAD,
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

test('root README.md is DOCS_ONLY', () => {
  assert.equal(classify('M\tREADME.md\n').mode, 'DOCS_ONLY');
});

test('.ai Markdown is DOCS_ONLY', () => {
  assert.equal(classify('M\t.ai/tasks/example.md\n').mode, 'DOCS_ONLY');
});

test('docs Markdown is DOCS_ONLY', () => {
  assert.equal(classify('A\tdocs/example.md\n').mode, 'DOCS_ONLY');
});

test('.ai YAML is FULL', () => {
  assert.equal(classify('M\t.ai/example.yml\n').mode, 'FULL');
});

test('workflow change is FULL', () => {
  assert.equal(classify('M\t.github/workflows/ci.yml\n').mode, 'FULL');
});

test('package and lock changes are FULL', () => {
  assert.equal(classify('M\tpackage.json\n').mode, 'FULL');
  assert.equal(classify('M\tpackage-lock.json\n').mode, 'FULL');
});

test('script change is FULL', () => {
  assert.equal(classify('M\tscripts/example.mjs\n').mode, 'FULL');
});

test('library source change is FULL', () => {
  assert.equal(classify('M\tlib/example.ts\n').mode, 'FULL');
});

test('test source change is FULL', () => {
  assert.equal(classify('M\ttests/example.test.ts\n').mode, 'FULL');
});

test('Supabase migration change is FULL', () => {
  assert.equal(classify('A\tsupabase/migrations/example.sql\n').mode, 'FULL');
});

test('mixed docs and non-doc change is FULL', () => {
  assert.equal(classify('M\tREADME.md\nM\tlib/example.ts\n').mode, 'FULL');
});

test('deletion of non-doc is FULL', () => {
  assert.equal(classify('D\tlib/example.ts\n').mode, 'FULL');
});

test('rename from non-doc into docs is FULL when diff is rename-disabled', () => {
  const result = classify('D\tlib/example.ts\nA\tdocs/example.md\n');
  assert.equal(result.mode, 'FULL');
});

test('malformed or unknown status is FULL', () => {
  assert.equal(classify('R100\tlib/a.ts\tdocs/a.md\n').mode, 'FULL');
  assert.equal(classify('Q\tdocs/a.md\n').mode, 'FULL');
});

test('empty change evidence is FULL', () => {
  assert.equal(classify('').mode, 'FULL');
});

test('classifier error is FULL', () => {
  const result = classify('', { diffError: 'simulated git failure' });
  assert.equal(result.mode, 'FULL');
  assert.match(result.reason, /^classifier-error:/);
});

test('manual dispatch is always FULL', () => {
  const result = classifyEvent({
    eventName: 'workflow_dispatch',
    baseSha: '',
    headSha: '',
    diffText: '',
  });
  assert.equal(result.mode, 'FULL');
  assert.equal(result.reason, 'manual-dispatch');
});

test('missing or invalid PR SHAs are FULL', () => {
  assert.equal(classify('M\tREADME.md\n', { baseSha: '' }).mode, 'FULL');
  assert.equal(classify('M\tREADME.md\n', { headSha: 'not-a-sha' }).mode, 'FULL');
});

test('parser rejects traversal and malformed paths', () => {
  assert.equal(parseNameStatus('M\t../README.md\n').ok, false);
  assert.equal(parseNameStatus('M\tdocs//README.md\n').ok, false);
});

test('record classifier fails closed on malformed record arrays', () => {
  assert.equal(classifyRecords([]).mode, 'FULL');
  assert.equal(classifyRecords([{ status: 'Q', path: 'README.md' }]).mode, 'FULL');
});
