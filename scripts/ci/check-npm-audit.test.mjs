import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateAuditReport } from './check-npm-audit.mjs';

const reviewDate = new Date('2026-08-01T00:00:00.000Z');
const policies = JSON.parse(
  readFileSync(new URL('./npm-audit-policy.json', import.meta.url), 'utf8'),
);
const policy = policies.frontend;

test('audit policy accepts only the documented current Router finding', () => {
  const result = evaluateAuditReport({
    vulnerabilities: {
      'react-router': {
        severity: 'high',
        via: [{ title: 'React Router vulnerable to CSRF in Action Server Functions' }],
      },
      'react-router-dom': {
        severity: 'high',
        via: ['react-router'],
      },
      uuid: {
        severity: 'moderate',
        via: [{ title: 'Moderate UUID finding' }],
      },
    },
  }, policy, reviewDate);

  assert.equal(result.accepted.length, 2);
  assert.deepEqual(result.blocked, []);
});

test('audit policy blocks a new high-severity package', () => {
  const result = evaluateAuditReport({
    vulnerabilities: {
      axios: {
        severity: 'high',
        via: [{ title: 'New Axios advisory' }],
      },
    },
  }, policy, reviewDate);

  assert.deepEqual(result.accepted, []);
  assert.equal(result.blocked[0].name, 'axios');
});

test('audit policy does not broadly allow unrelated Router advisories', () => {
  const result = evaluateAuditReport({
    vulnerabilities: {
      'react-router': {
        severity: 'high',
        via: [{ title: 'React Router unrelated remote code execution issue' }],
      },
    },
  }, policy, reviewDate);

  assert.equal(result.blocked[0].name, 'react-router');
});

test('audit policy expires documented exceptions', () => {
  const result = evaluateAuditReport({
    vulnerabilities: {
      'react-router': {
        severity: 'high',
        via: [{ title: 'React Router vulnerable to CSRF in Action Server Functions' }],
      },
    },
  }, policy, new Date('2026-09-01T00:00:00.000Z'));

  assert.deepEqual(result.accepted, []);
  assert.equal(result.blocked[0].name, 'react-router');
});

test('audit policy fails when npm returns an audit service error', () => {
  assert.throws(
    () => evaluateAuditReport({
      error: { summary: 'registry unavailable' },
    }, policy, reviewDate),
    /npm audit failed: registry unavailable/,
  );
});
