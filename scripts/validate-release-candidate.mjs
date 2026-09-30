import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
if (existsSync('.ai/CURRENT_PHASE.md') && existsSync('docs/PRODUCT_ROADMAP.md')) {
  const phase = readFileSync('.ai/CURRENT_PHASE.md', 'utf8');
  const roadmap = readFileSync('docs/PRODUCT_ROADMAP.md', 'utf8');
  for (const [name, content] of [['current phase', phase], ['roadmap', roadmap]]) {
    check(content.includes('FFH-P01') && /PLANNED/.test(content), `${name} must identify FFH-P01 as PLANNED`);
    check(!/FFH-P01[^\n]*ACTIVE|State:\s*ACTIVE/.test(content), `${name} must not activate FFH-P01`);
    check(/production deployment/i.test(content) && /not authoriz|unauthoriz|separate/i.test(content), `${name} must preserve separate production authorization`);
  }
}
if (existsSync('docs/WORKFLOW.md')) {
  const workflow = readFileSync('docs/WORKFLOW.md', 'utf8');
  check(workflow.includes('Speed Workflow V2.1') && /historical evidence/i.test(workflow), 'V2.1 must be active and archive historical');
  check(/explicit Ryan merge authorization/i.test(workflow), 'merge must require Product Owner authorization');
}
if (existsSync('.github/workflows/ci.yml')) {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  check(!/validate-ai-state|ci-change-mode|deploy|production environment/i.test(ci), 'legacy authority or production deployment in active CI');
  check(ci.includes('validate-release-candidate.mjs'), 'active CI must validate release shape');
  const expectedActions = new Map([
    ['actions/checkout', '11d5960a326750d5838078e36cf38b85af677262'],
    ['actions/setup-node', '49933ea5288caeca8642d1e84afbd3f7d6820020'],
  ]);
  const actionCounts = new Map();
  for (const line of ci.split(/\r?\n/).filter(line => /^\s*(?:-\s*)?uses\s*:/.test(line))) {
    const reference = line.replace(/^\s*(?:-\s*)?uses\s*:\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
    const match = /^([^@\s]+)@([0-9a-f]{40})$/.exec(reference);
    check(Boolean(match), `Action must use a full immutable SHA: ${reference}`);
    if (!match) continue;
    const [, identity, sha] = match;
    check(expectedActions.get(identity) === sha, `unexpected Action identity/pin: ${reference}`);
    actionCounts.set(identity, (actionCounts.get(identity) ?? 0) + 1);
  }
  for (const identity of expectedActions.keys()) check(actionCounts.get(identity) === 2, `expected ${identity} pin in both FAST and FULL jobs`);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Speed Workflow V2.1 release shape valid; .history excluded from active-authority scan.');
