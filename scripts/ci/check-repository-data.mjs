import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');

const allowedSqlPaths = [
  /^docs\/database\/(?:schema|queries)\.sql$/,
  /^backend\/src\/database\/migrations\/[^/]+\.sql$/,
];

const backupExtensions = /(?:\.dump|\.bak|\.backup|\.sql\.gz|\.sql\.gpg)$/i;
const backupDirectories = /(?:^|\/)(?:backups?|dumps?)(?:\/|$)/i;

export function findForbiddenDataFiles(files) {
  return files.filter((rawFile) => {
    const file = rawFile.replaceAll('\\', '/');

    if (backupDirectories.test(file) || backupExtensions.test(file)) {
      return true;
    }

    if (!file.toLowerCase().endsWith('.sql')) {
      return false;
    }

    return !allowedSqlPaths.some((pattern) => pattern.test(file));
  });
}

export function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  return output
    .split('\0')
    .filter(Boolean)
    .filter((file) => existsSync(path.join(repositoryRoot, file)));
}

export function runRepositoryDataPolicy(files = getTrackedFiles()) {
  const forbiddenFiles = findForbiddenDataFiles(files);

  if (forbiddenFiles.length > 0) {
    throw new Error(
      `Tracked database dump or unapproved SQL files found:\n${forbiddenFiles
        .map((file) => `- ${file}`)
        .join('\n')}`,
    );
  }

  process.stdout.write(
    '[repository-data-policy] No tracked database dumps or unapproved SQL files found.\n',
  );
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entryPath) {
  try {
    runRepositoryDataPolicy();
  } catch (error) {
    process.stderr.write(`[repository-data-policy] ${error.message}\n`);
    process.exitCode = 1;
  }
}
