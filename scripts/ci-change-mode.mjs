import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SHA_RE = /^[0-9a-f]{40}$/i;
const ALLOWED_STATUSES = new Set(['A', 'M', 'D']);

export function normalizeRepoPath(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) return null;
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  return normalized;
}

export function isDocumentationPath(value) {
  const normalized = normalizeRepoPath(value);
  if (!normalized) return false;
  if (/^[^/]+\.md$/.test(normalized)) return true;
  if (/^\.ai\/.+\.md$/.test(normalized)) return true;
  if (/^docs\/.+\.md$/.test(normalized)) return true;
  return false;
}

export function parseNameStatus(diffText) {
  if (typeof diffText !== 'string' || !diffText.trim()) {
    return { ok: false, reason: 'empty-change-evidence', records: [] };
  }

  const records = [];
  for (const rawLine of diffText.split(/\r?\n/)) {
    if (!rawLine) continue;
    const parts = rawLine.split('\t');
    if (parts.length !== 2) {
      return { ok: false, reason: 'malformed-change-evidence', records: [] };
    }
    const [status, rawPath] = parts;
    if (!ALLOWED_STATUSES.has(status)) {
      return { ok: false, reason: `unsupported-change-status:${status || 'empty'}`, records: [] };
    }
    const repoPath = normalizeRepoPath(rawPath);
    if (!repoPath) {
      return { ok: false, reason: 'invalid-change-path', records: [] };
    }
    records.push({ status, path: repoPath });
  }

  if (!records.length) {
    return { ok: false, reason: 'empty-change-evidence', records: [] };
  }
  return { ok: true, reason: 'parsed', records };
}

export function classifyRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { mode: 'FULL', reason: 'empty-change-evidence', records: [] };
  }
  for (const record of records) {
    if (!record || !ALLOWED_STATUSES.has(record.status)) {
      return { mode: 'FULL', reason: 'unsupported-change-status', records };
    }
    if (!isDocumentationPath(record.path)) {
      return {
        mode: 'FULL',
        reason: `non-doc-change:${record.status}:${record.path}`,
        records,
      };
    }
  }
  return { mode: 'DOCS_ONLY', reason: 'all-changes-match-doc-allowlist', records };
}

export function classifyEvent({ eventName, baseSha, headSha, diffText, diffError = null }) {
  if (eventName === 'workflow_dispatch') {
    return { mode: 'FULL', reason: 'manual-dispatch', records: [] };
  }
  if (eventName !== 'pull_request') {
    return { mode: 'FULL', reason: `unsupported-event:${eventName || 'empty'}`, records: [] };
  }
  if (!SHA_RE.test(baseSha ?? '') || !SHA_RE.test(headSha ?? '')) {
    return { mode: 'FULL', reason: 'missing-or-invalid-pr-sha', records: [] };
  }
  if (diffError) {
    return { mode: 'FULL', reason: `classifier-error:${sanitizeReason(diffError)}`, records: [] };
  }
  const parsed = parseNameStatus(diffText);
  if (!parsed.ok) {
    return { mode: 'FULL', reason: parsed.reason, records: parsed.records };
  }
  return classifyRecords(parsed.records);
}

function sanitizeReason(value) {
  return String(value).replace(/[\r\n\t]+/g, ' ').slice(0, 240);
}

function getGitDiff(baseSha, headSha) {
  const result = spawnSync(
    'git',
    ['diff', '--no-renames', '--name-status', baseSha, headSha],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.error) return { diffText: '', diffError: result.error.message };
  if (result.status !== 0) {
    return {
      diffText: result.stdout ?? '',
      diffError: `git-diff-exit-${result.status}:${sanitizeReason(result.stderr ?? '')}`,
    };
  }
  return { diffText: result.stdout ?? '', diffError: null };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${name}=${String(value).replace(/[\r\n]+/g, ' ')}\n`, 'utf8');
}

function appendSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const evidenceDir = process.env.CI_EVIDENCE_DIR || 'ci-evidence';
  ensureDir(evidenceDir);

  const eventName = process.env.GITHUB_EVENT_NAME ?? '';
  const baseSha = process.env.CI_BASE_SHA ?? '';
  const headSha = process.env.CI_HEAD_SHA ?? '';
  const testedSha = process.env.GITHUB_SHA ?? '';
  const prNumber = process.env.CI_PR_NUMBER ?? '';
  const runId = process.env.GITHUB_RUN_ID ?? '';
  const runNumber = process.env.GITHUB_RUN_NUMBER ?? '';
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '';
  const repository = process.env.GITHUB_REPOSITORY ?? '';

  let diffText = '';
  let diffError = null;
  if (eventName === 'pull_request') {
    ({ diffText, diffError } = getGitDiff(baseSha, headSha));
  }

  const result = classifyEvent({ eventName, baseSha, headSha, diffText, diffError });

  const changedPathLines = result.records.length
    ? result.records.map((record) => `${record.status}\t${record.path}`)
    : ['# no parsed pull-request change records'];
  fs.writeFileSync(path.join(evidenceDir, 'changed-paths.tsv'), `${changedPathLines.join('\n')}\n`, 'utf8');

  const classification = {
    mode: result.mode,
    reason: result.reason,
    eventName,
    repository,
    prNumber: prNumber || null,
    baseSha: baseSha || null,
    headSha: headSha || null,
    testedSha: testedSha || null,
    runId: runId || null,
    runNumber: runNumber || null,
    runAttempt: runAttempt || null,
    job: 'verify',
    changedPathsFile: 'changed-paths.tsv',
  };
  fs.writeFileSync(
    path.join(evidenceDir, 'classification.json'),
    `${JSON.stringify(classification, null, 2)}\n`,
    'utf8',
  );

  writeGithubOutput('mode', result.mode);
  writeGithubOutput('reason', result.reason);

  appendSummary([
    '## Foundation CI change classification',
    '',
    `- Mode: **${result.mode}**`,
    `- Reason: \`${result.reason}\``,
    `- Event: \`${eventName || 'unknown'}\``,
    `- PR: \`${prNumber || 'n/a'}\``,
    `- Base SHA: \`${baseSha || 'n/a'}\``,
    `- Head SHA: \`${headSha || 'n/a'}\``,
    `- Tested SHA (github.sha): \`${testedSha || 'n/a'}\``,
    `- Run: \`${runId || 'n/a'}\` / #${runNumber || 'n/a'} / attempt ${runAttempt || 'n/a'}`,
    '- Job: `verify`',
    '',
    'Changed path/status evidence is stored in the `foundation-ci-evidence` artifact.',
  ]);

  console.log(`Foundation CI mode: ${result.mode}`);
  console.log(`Classification reason: ${result.reason}`);
  for (const line of changedPathLines) console.log(line);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    main();
  } catch (error) {
    const evidenceDir = process.env.CI_EVIDENCE_DIR || 'ci-evidence';
    try {
      ensureDir(evidenceDir);
      fs.writeFileSync(
        path.join(evidenceDir, 'classifier-fatal-error.txt'),
        `${sanitizeReason(error?.stack ?? error)}\n`,
        'utf8',
      );
    } catch {
      // The job itself will fail closed if even evidence writing is unavailable.
    }
    console.error(error);
    process.exit(1);
  }
}
