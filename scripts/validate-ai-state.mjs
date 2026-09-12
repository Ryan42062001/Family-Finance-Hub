import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const taskDir = path.join(repoRoot, '.ai', 'tasks');
const indexPath = path.join(taskDir, 'TASK_INDEX.md');

const canonicalStates = new Set([
  'QUEUED',
  'ACTIVE',
  'VALIDATING',
  'READY_FOR_MANAGER',
  'ACCEPTED',
  'AUDIT_READY',
  'CLOSED',
  'BLOCKED',
  'REMEDIATION',
]);

const v1RequiredFields = [
  'Owner',
  'State',
  'Execution mode',
  'Dependency classification',
  'Activation',
  'Blocked by',
  'Next owner',
  'PRODUCTION_SHA',
  'VALIDATED_CI',
  'HANDOFF_SHA',
  'INTEGRATION_SHA',
  'MANAGER_VERDICT',
  'AUDIT_STATUS',
];

const errors = [];
const warnings = [];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fieldValue(content, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^${escaped}:\\s*(.+?)\\s*$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function isUnestablished(value) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return normalized.includes('not yet established') || normalized === 'pending';
}

const index = read(indexPath);
const indexStates = new Map();
for (const line of index.split(/\r?\n/)) {
  const match = line.match(/^\|\s*(FFH-\d{3})\s*\|[^|]*\|\s*([^|]+?)\s*\|/);
  if (match) indexStates.set(match[1], match[2].trim());
}

const taskFiles = fs
  .readdirSync(taskDir)
  .filter((name) => /^FFH-\d{3}\.md$/.test(name))
  .sort();

for (const file of taskFiles) {
  const taskId = file.slice(0, -3);
  const content = read(path.join(taskDir, file));
  const state = fieldValue(content, 'State');
  const schema = fieldValue(content, 'Schema');

  if (!state) {
    errors.push(`${taskId}: missing State field`);
    continue;
  }

  if (!canonicalStates.has(state)) {
    errors.push(`${taskId}: non-canonical State '${state}'`);
  }

  const indexState = indexStates.get(taskId);
  if (!indexState) {
    errors.push(`${taskId}: missing TASK_INDEX row`);
  } else if (indexState !== state) {
    errors.push(`${taskId}: TASK_INDEX state '${indexState}' != task State '${state}'`);
  }

  if (schema === 'FFH_TASK_V1') {
    for (const field of v1RequiredFields) {
      if (!fieldValue(content, field)) {
        errors.push(`${taskId}: FFH_TASK_V1 missing '${field}'`);
      }
    }

    const executionMode = fieldValue(content, 'Execution mode');
    if (!['STANDARD_CHAT', 'WORK_MODE_PREFERRED', 'WORK_MODE_HIGH_VALUE'].includes(executionMode)) {
      errors.push(`${taskId}: invalid Execution mode '${executionMode}'`);
    }

    const managerVerdict = fieldValue(content, 'MANAGER_VERDICT');
    const handoffSha = fieldValue(content, 'HANDOFF_SHA');
    const integrationSha = fieldValue(content, 'INTEGRATION_SHA');
    const auditStatus = fieldValue(content, 'AUDIT_STATUS');

    if (state === 'READY_FOR_MANAGER' && isUnestablished(handoffSha)) {
      errors.push(`${taskId}: READY_FOR_MANAGER requires established HANDOFF_SHA`);
    }

    if (['ACCEPTED', 'AUDIT_READY', 'CLOSED'].includes(state) && managerVerdict !== 'ACCEPTED') {
      errors.push(`${taskId}: ${state} requires MANAGER_VERDICT: ACCEPTED`);
    }

    if (state === 'AUDIT_READY' && isUnestablished(integrationSha)) {
      errors.push(`${taskId}: AUDIT_READY requires established INTEGRATION_SHA`);
    }

    if (state === 'CLOSED' && (!auditStatus || ['NOT_READY', 'REQUIRED', 'IN_PROGRESS'].includes(auditStatus))) {
      errors.push(`${taskId}: CLOSED requires a terminal AUDIT_STATUS or NOT_REQUIRED reason`);
    }
  }
}

for (const taskId of indexStates.keys()) {
  const expectedFile = path.join(taskDir, `${taskId}.md`);
  if (!fs.existsSync(expectedFile)) {
    errors.push(`${taskId}: TASK_INDEX row has no matching task file`);
  }
}

if (!taskFiles.length) {
  warnings.push('No FFH task files found.');
}

for (const warning of warnings) console.warn(`AI state warning: ${warning}`);

if (errors.length) {
  console.error('AI state validation FAILED:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`AI state validation PASS: ${taskFiles.length} task files are index-consistent; FFH_TASK_V1 gates satisfied.`);
