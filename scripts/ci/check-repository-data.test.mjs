import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findForbiddenDataFiles,
  runRepositoryDataPolicy,
} from './check-repository-data.mjs';

test('allows canonical course and migration SQL files', () => {
  const files = [
    'docs/database/schema.sql',
    'docs/database/queries.sql',
    'backend/src/database/migrations/202607310001-current-schema-baseline.sql',
    'backend/src/models/user.model.js',
  ];

  assert.deepEqual(findForbiddenDataFiles(files), []);
});

test('blocks SQL dumps in backup directories', () => {
  const files = ['backups/toubpos_db_backup_2026-07-13.sql'];

  assert.deepEqual(findForbiddenDataFiles(files), files);
});

test('blocks dump and encrypted backup artifacts anywhere', () => {
  const files = [
    'private/database.dump',
    'output/database.sql.gz',
    'output/database.sql.gpg',
    'snapshot.backup',
    'snapshot.sql.gpg.sha256',
  ];

  assert.deepEqual(findForbiddenDataFiles(files), files);
});

test('blocks SQL files outside the explicit allowlist', () => {
  const files = ['database-export.sql', 'docs/database/customer-data.sql'];

  assert.deepEqual(findForbiddenDataFiles(files), files);
});

test('policy reports every forbidden tracked file', () => {
  assert.throws(
    () => runRepositoryDataPolicy(['backup.sql', 'backups/data.sql']),
    /backup\.sql[\s\S]*backups\/data\.sql/,
  );
});
