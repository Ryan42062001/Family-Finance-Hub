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
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Speed Workflow V2.1 release shape valid; .history excluded from active-authority scan.');
