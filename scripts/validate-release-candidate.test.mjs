import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateActionReferences, validatePhaseAuthority } from './validate-release-candidate.mjs';

const checkout = 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262';
const setupNode = 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
const validFixture = (extra = '') => `jobs:\n  fast:\n    steps:\n      - uses: ${checkout}\n      - uses: ${setupNode}\n  full:\n    steps:\n      - uses: ${checkout}\n      - uses: ${setupNode}\n${extra}`;
const rejected = (name, source, pattern) => test(name, () => {
  const failures = validateActionReferences(source);
  assert.notEqual(failures.length, 0);
  if (pattern) assert.match(failures.join('\n'), pattern);
});

test('canonical current workflow passes', () => {
  assert.deepEqual(validateActionReferences(readFileSync('.github/workflows/ci.yml', 'utf8')), []);
});

test('approved references in quoted and flow syntax are collected and pass', () => {
  const source = `jobs:\n  fast:\n    steps:\n      - "uses": ${checkout}\n      - 'uses': ${setupNode}\n  full:\n    steps:\n      - { uses: ${checkout} }\n      - { "uses": ${setupNode} }\n`;
  assert.deepEqual(validateActionReferences(source), []);
});

rejected('quoted key bypass is rejected', validFixture(`  bypass:\n    steps:\n      - "uses": owner/action@main\n`), /full immutable SHA/);
rejected('single-quoted key bypass is rejected', validFixture(`  bypass:\n    steps:\n      - 'uses': owner/action@main\n`), /full immutable SHA/);
rejected('flow mapping bypass is rejected', validFixture(`  bypass:\n    steps:\n      - { uses: owner/action@main }\n`), /full immutable SHA/);
rejected('mutable tag is rejected', validFixture().replace(`${checkout}`, 'actions/checkout@v4'), /full immutable SHA/);
rejected('truncated SHA is rejected', validFixture().replace(`${checkout}`, 'actions/checkout@11d5960a'), /full immutable SHA/);
rejected('malformed SHA is rejected', validFixture().replace(`${checkout}`, `actions/checkout@${'g'.repeat(40)}`), /full immutable SHA/);
rejected('wrong full SHA is rejected', validFixture().replace(`${checkout}`, `actions/checkout@${'0'.repeat(40)}`), /unexpected Action pin/);
rejected('unexpected Action identity is rejected', validFixture(`  bypass:\n    steps:\n      - uses: owner/action@${'a'.repeat(40)}\n`), /unexpected Action identity/);
rejected('non-string uses value is rejected', validFixture(`  bypass:\n    steps:\n      - uses: 42\n`), /must be a string/);
rejected('malformed YAML is rejected', 'jobs:\n  fast: [\n', /cannot parse/);
rejected('additional unapproved Action is rejected while approved counts remain', validFixture(`  bypass:\n    steps:\n      - { uses: owner/action@${'a'.repeat(40)} }\n`), /unexpected Action identity/);
rejected('missing approved occurrence is rejected', validFixture().replace(`      - uses: ${checkout}\n`, '', 1), /exactly twice/);


test('FFH-P01 BUILDING lifecycle authority is accepted', () => {
  const phase = '# Current phase\n\nFFH-P01 — Release Blocker Integration & Production Readiness\n\nState: BUILDING\nProduction deployment is separate and not authorized.\n';
  const roadmap = '# Roadmap\n\n## FFH-P01\nState: BUILDING. Risk: HIGH.\nProduction deployment remains separately authorized.\n';
  assert.deepEqual(validatePhaseAuthority(phase, roadmap), []);
});

test('FFH-P01 lifecycle authority rejects invalid ACTIVE state', () => {
  const phase = '# Current phase\nFFH-P01\nState: ACTIVE\nProduction deployment is separate and not authorized.\n';
  const roadmap = '# Roadmap\nFFH-P01\nState: ACTIVE\nProduction deployment is separate and not authorized.\n';
  assert.match(validatePhaseAuthority(phase, roadmap).join('\n'), /valid FFH-P01 lifecycle state/);
});

test('FFH-P01 lifecycle authority rejects state drift', () => {
  const phase = '# Current phase\nFFH-P01\nState: BUILDING\nProduction deployment is separate and not authorized.\n';
  const roadmap = '# Roadmap\nFFH-P01\nState: PREVIEW_READY\nProduction deployment is separate and not authorized.\n';
  assert.match(validatePhaseAuthority(phase, roadmap).join('\n'), /must agree/);
});

test('FFH-P01 lifecycle authority preserves separate production authorization', () => {
  const phase = '# Current phase\nFFH-P01\nState: BUILDING\n';
  const roadmap = '# Roadmap\nFFH-P01\nState: BUILDING\nProduction deployment remains separately authorized.\n';
  assert.match(validatePhaseAuthority(phase, roadmap).join('\n'), /preserve separate production authorization/);
});
