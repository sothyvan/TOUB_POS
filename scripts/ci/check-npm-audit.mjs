import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');
const policyPath = path.join(scriptDirectory, 'npm-audit-policy.json');
const severityRanks = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function getSeverityRank(severity) {
  return severityRanks[String(severity || '').toLowerCase()] ?? -1;
}

function isExceptionCurrent(exception, now) {
  if (!exception.expiresOn) {
    return false;
  }
  const expiresAt = new Date(`${exception.expiresOn}T23:59:59.999Z`);
  return Number.isFinite(expiresAt.getTime()) && now <= expiresAt;
}

function matchesException(vulnerability, exception, now) {
  if (
    vulnerability.name !== exception.name
    || vulnerability.severity !== exception.severity
    || !isExceptionCurrent(exception, now)
  ) {
    return false;
  }

  const viaEntries = Array.isArray(vulnerability.via) ? vulnerability.via : [];
  if (viaEntries.length === 0) {
    return false;
  }

  return viaEntries.every((via) => {
    if (typeof via === 'string') {
      return exception.allowedViaPackages?.includes(via) === true;
    }

    if (!via || typeof via !== 'object' || !exception.advisoryTitlePattern) {
      return false;
    }

    return new RegExp(exception.advisoryTitlePattern, 'i').test(via.title || '');
  });
}

export function evaluateAuditReport(report, projectPolicy, now = new Date()) {
  if (report?.error) {
    throw new Error(`npm audit failed: ${report.error.summary || report.error.message || 'unknown error'}`);
  }

  const minimumRank = getSeverityRank(projectPolicy.minimumSeverity);
  if (minimumRank < 0) {
    throw new Error(`Invalid minimum audit severity: ${projectPolicy.minimumSeverity}`);
  }

  const blocked = [];
  const accepted = [];
  for (const [name, vulnerability] of Object.entries(report?.vulnerabilities || {})) {
    const normalized = { ...vulnerability, name };
    if (getSeverityRank(normalized.severity) < minimumRank) {
      continue;
    }

    const exception = (projectPolicy.exceptions || []).find((candidate) => (
      matchesException(normalized, candidate, now)
    ));
    if (exception) {
      accepted.push({
        name,
        severity: normalized.severity,
        expiresOn: exception.expiresOn,
      });
    } else {
      blocked.push({
        name,
        severity: normalized.severity,
        via: normalized.via,
      });
    }
  }

  return { accepted, blocked };
}

function runNpmAudit(projectDirectory) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(
    npmCommand,
    ['audit', '--omit=dev', '--json'],
    {
      cwd: projectDirectory,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      shell: process.platform === 'win32',
    },
  );

  if (result.error) {
    throw result.error;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `npm audit did not return valid JSON.${result.stderr ? ` ${result.stderr.trim()}` : ''}`,
    );
  }
}

function formatBlockedFinding(finding) {
  const advisoryTitles = (finding.via || [])
    .filter((via) => via && typeof via === 'object')
    .map((via) => via.title)
    .filter(Boolean);
  const detail = advisoryTitles.length > 0 ? `: ${advisoryTitles.join('; ')}` : '';
  return `- ${finding.name} (${finding.severity})${detail}`;
}

export function runAuditPolicy(projectName) {
  const policies = JSON.parse(readFileSync(policyPath, 'utf8'));
  const projectPolicy = policies[projectName];
  if (!projectPolicy) {
    throw new Error(`No npm audit policy exists for "${projectName}".`);
  }

  const projectDirectory = path.join(repositoryRoot, projectName);
  const report = runNpmAudit(projectDirectory);
  const result = evaluateAuditReport(report, projectPolicy);

  for (const finding of result.accepted) {
    process.stdout.write(
      `[audit-policy] Accepted ${finding.name} ${finding.severity} finding until ${finding.expiresOn}.\n`,
    );
  }

  if (result.blocked.length > 0) {
    const findings = result.blocked.map(formatBlockedFinding).join('\n');
    throw new Error(`Production dependency audit found blocked vulnerabilities:\n${findings}`);
  }

  process.stdout.write(
    `[audit-policy] ${projectName} has no unapproved ${projectPolicy.minimumSeverity}/critical production findings.\n`,
  );
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entryPath) {
  try {
    runAuditPolicy(process.argv[2]);
  } catch (error) {
    process.stderr.write(`[audit-policy] ${error.message}\n`);
    process.exitCode = 1;
  }
}
