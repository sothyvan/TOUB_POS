import { readFileSync } from 'node:fs';
import path from 'node:path';

function normalizeInlineCertificate(value) {
  return String(value || '').trim().replace(/\\n/g, '\n');
}

function assertCertificateShape(certificate) {
  if (
    !certificate.includes('-----BEGIN CERTIFICATE-----')
    || !certificate.includes('-----END CERTIFICATE-----')
  ) {
    throw new Error(
      'Database CA must be a PEM certificate containing BEGIN CERTIFICATE and END CERTIFICATE markers.',
    );
  }
}

export function getDatabaseTlsOptions({
  env = process.env,
  cwd = process.cwd(),
  readFile = readFileSync,
} = {}) {
  const isProduction = env.NODE_ENV === 'production';
  const inlineCa = String(env.DB_SSL_CA || '').trim();
  const caPath = String(env.DB_SSL_CA_PATH || '').trim();

  if (!inlineCa && !caPath) {
    if (isProduction) {
      throw new Error(
        'Production database TLS requires DB_SSL_CA_PATH or DB_SSL_CA.',
      );
    }
    return undefined;
  }

  if (inlineCa && caPath) {
    throw new Error(
      'Configure only one database CA source: DB_SSL_CA_PATH or DB_SSL_CA.',
    );
  }

  let ca;
  if (inlineCa) {
    ca = normalizeInlineCertificate(inlineCa);
  } else {
    const resolvedPath = path.resolve(cwd, caPath);
    try {
      ca = readFile(resolvedPath, 'utf8').trim();
    } catch {
      throw new Error(`Unable to read the database CA file at ${resolvedPath}.`);
    }
  }

  assertCertificateShape(ca);

  return {
    require: true,
    rejectUnauthorized: true,
    ca,
  };
}
