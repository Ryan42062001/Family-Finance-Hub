import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const expectedAi = ['ARCHITECTURE.md', 'CURRENT_PHASE.md', 'DECISIONS.md', 'PROJECT.md', 'REPO_MAP.md'];
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const files = dir => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name).replaceAll('\\', '/')]) : [];
const ai = files('.ai').map(file => file.slice(4)).sort();
check(JSON.stringify(ai) === JSON.stringify(expectedAi), `active .ai shape: ${ai.join(', ')}`);
check(JSON.stringify(files('.github/workflows')) === JSON.stringify(['.github/workflows/ci.yml']), 'only canonical active CI workflow may exist');
for (const path of ['AGENTS.md', 'docs/WORKFLOW.md', 'docs/workflow/PHASE_TEMPLATE.md', 'docs/PRODUCT_ROADMAP.md', '.history/workflow-v3-1/README.md']) check(existsSync(path), `missing ${path}`);
for (const path of ['scripts/ci-change-mode.mjs', 'scripts/ci-change-mode.test.mjs', 'scripts/validate-ai-state.mjs', '.ai/shared', '.ai/tasks', '.ai/roles', '.ai/manager', '.ai/audit']) check(!existsSync(path), `legacy active authority: ${path}`);
try {
  const { scripts = {} } = JSON.parse(readFileSync('package.json', 'utf8'));
  check(scripts['ai:validate-state'] === 'node scripts/validate-release-candidate.mjs', 'ai:validate-state must invoke the active V2.1 validator');
  check(scripts.verify === 'npm run ai:validate-state && npm test && npm run test:security && npm run typecheck && npm run lint && npm run build', 'verify must preserve the complete validation chain');
  const visited = new Set();
  const validateAlias = name => {
    if (visited.has(name)) return;
    visited.add(name);
    const command = scripts[name];
    check(typeof command === 'string', `missing validation alias: ${name}`);
    if (typeof command !== 'string') return;
    check(!/\.history[\\/]|validate-ai-state|ci-change-mode/.test(command), `legacy/archived control-plane reference in npm alias: ${name}`);
    for (const match of command.matchAll(/\bnode\s+(?:--[\w-]+\s+)*["']?([^\s"'&;]+\.(?:mjs|cjs|js))\b/g)) {
      check(existsSync(match[1]), `missing validator/script in npm alias ${name}: ${match[1]}`);
    }
    for (const match of command.matchAll(/\bnpm\s+run\s+([\w:-]+)/g)) validateAlias(match[1]);
  };
  for (const name of Object.keys(scripts).filter(name => /validate|verify|check/i.test(name))) validateAlias(name);
} catch (error) {
  check(false, `cannot validate npm aliases: ${error.message}`);
}
export const phaseLifecycleStates = [
  'PLANNED',
  'BUILDING',
  'PREVIEW_READY',
  'PUNCH_LIST',
  'FREEZE_READY',
  'AUDITING',
  'REMEDIATING',
  'CLOSED',
];

export function validatePhaseAuthority(phase, roadmap) {
  const phaseFailures = [];
  const states = new Map();
  for (const [name, content] of [['current phase', phase], ['roadmap', roadmap]]) {
    if (!content.includes('FFH-P01')) {
      phaseFailures.push(`${name} must identify FFH-P01`);
      continue;
    }
    const state = content.match(/\bState:\s*([A-Z_]+)\b/)?.[1];
    if (!state || !phaseLifecycleStates.includes(state)) {
      phaseFailures.push(`${name} must use a valid FFH-P01 lifecycle state`);
    } else {
      states.set(name, state);
    }
    if (!(/production deployment/i.test(content) && /not authoriz|unauthoriz|separate/i.test(content))) {
      phaseFailures.push(`${name} must preserve separate production authorization`);
    }
  }
  if (states.has('current phase') && states.has('roadmap') && states.get('current phase') !== states.get('roadmap')) {
    phaseFailures.push('current phase and roadmap must agree on FFH-P01 lifecycle state');
  }
  return phaseFailures;
}

if (existsSync('.ai/CURRENT_PHASE.md') && existsSync('docs/PRODUCT_ROADMAP.md')) {
  const phase = readFileSync('.ai/CURRENT_PHASE.md', 'utf8');
  const roadmap = readFileSync('docs/PRODUCT_ROADMAP.md', 'utf8');
  failures.push(...validatePhaseAuthority(phase, roadmap));
}
if (existsSync('docs/WORKFLOW.md')) {
  const workflow = readFileSync('docs/WORKFLOW.md', 'utf8');
  check(workflow.includes('Speed Workflow V2.1') && /historical evidence/i.test(workflow), 'V2.1 must be active and archive historical');
  check(/explicit Ryan merge authorization/i.test(workflow), 'merge must require Product Owner authorization');
}
export const expectedActions = new Map([
  ['actions/checkout', '11d5960a326750d5838078e36cf38b85af677262'],
  ['actions/setup-node', '49933ea5288caeca8642d1e84afbd3f7d6820020'],
]);

export function collectUsesValues(value, collected = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectUsesValues(item, collected);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uses') collected.push(child);
      collectUsesValues(child, collected);
    }
  }
  return collected;
}

export function validateActionReferences(ci) {
  const actionFailures = [];
  let document;
  try {
    document = yaml.load(ci);
  } catch (error) {
    return [`cannot parse active CI workflow YAML: ${error.message}`];
  }
  if (document === undefined || document === null || typeof document !== 'object') {
    return ['active CI workflow YAML must contain a mapping or sequence'];
  }
  const actionCounts = new Map();
  for (const reference of collectUsesValues(document)) {
    if (typeof reference !== 'string') {
      actionFailures.push(`Action reference must be a string: ${JSON.stringify(reference)}`);
      continue;
    }
    const match = /^([^@\s]+)@([0-9a-f]{40})$/.exec(reference);
    if (!match) {
      actionFailures.push(`Action must use a full immutable SHA: ${reference}`);
      continue;
    }
    const [, identity, sha] = match;
    if (!expectedActions.has(identity)) {
      actionFailures.push(`unexpected Action identity: ${identity}`);
      continue;
    }
    if (expectedActions.get(identity) !== sha) {
      actionFailures.push(`unexpected Action pin: ${reference}`);
      continue;
    }
    actionCounts.set(identity, (actionCounts.get(identity) ?? 0) + 1);
  }
  for (const identity of expectedActions.keys()) {
    if (actionCounts.get(identity) !== 2) actionFailures.push(`expected ${identity} pin exactly twice`);
  }
  return actionFailures;
}

if (existsSync('.github/workflows/ci.yml')) {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  check(!/validate-ai-state|ci-change-mode|deploy|production environment/i.test(ci), 'legacy authority or production deployment in active CI');
  check(ci.includes('validate-release-candidate.mjs'), 'active CI must validate release shape');
  failures.push(...validateActionReferences(ci));
}

if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Speed Workflow V2.1 release shape valid; .history excluded from active-authority scan.');
