"""Verify and restore an encrypted TouB POS backup into an isolated MySQL database."""

import argparse
import hashlib
import hmac
import os
import subprocess
import tempfile
import time


REQUIRED_TABLES = ("users", "stalls", "orders", "order_items", "schema_migrations")


def require_setting(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required restore setting: {name}")
    return value


def sha256_digest(file_path: str) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_checksum(encrypted_file: str, checksum_file: str) -> None:
    with open(checksum_file, "r", encoding="utf-8") as source:
        parts = source.read().strip().split()
    if len(parts) != 2 or parts[1] != os.path.basename(encrypted_file):
        raise SystemExit("Backup checksum sidecar has an invalid format or filename.")
    if not hmac.compare_digest(parts[0].lower(), sha256_digest(encrypted_file)):
        raise SystemExit("Encrypted backup checksum verification failed.")


def run_restore(encrypted_file: str, checksum_file: str | None = None) -> float:
    """Restore a verified artifact and return elapsed seconds."""
    encrypted_file = os.path.abspath(encrypted_file)
    checksum_file = os.path.abspath(checksum_file or f"{encrypted_file}.sha256")
    if not os.path.isfile(encrypted_file) or not os.path.isfile(checksum_file):
        raise SystemExit("Encrypted backup and checksum sidecar are both required.")
    verify_checksum(encrypted_file, checksum_file)

    passphrase = require_setting("BACKUP_ENCRYPTION_PASSPHRASE")
    restore_settings = {
        "host": require_setting("RESTORE_DB_HOST"),
        "port": os.environ.get("RESTORE_DB_PORT", "3306"),
        "user": require_setting("RESTORE_DB_USER"),
        "password": require_setting("RESTORE_DB_PASSWORD"),
        "database": require_setting("RESTORE_DB_NAME"),
    }
    mysql_environment = os.environ.copy()
    mysql_environment["MYSQL_PWD"] = restore_settings["password"]
    mysql_command = [
        "mysql",
        f"--host={restore_settings['host']}",
        f"--port={restore_settings['port']}",
        f"--user={restore_settings['user']}",
        restore_settings["database"],
    ]
    started_at = time.monotonic()

    try:
        with tempfile.TemporaryDirectory(prefix="toub-pos-restore-") as temp_dir:
            plaintext_file = os.path.join(temp_dir, "restore.sql")
            decrypt_result = subprocess.run(
                [
                    "gpg", "--batch", "--yes", "--pinentry-mode", "loopback",
                    "--passphrase-fd", "0", "--output", plaintext_file,
                    "--decrypt", encrypted_file,
                ],
                input=f"{passphrase}\n",
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )
            if decrypt_result.returncode != 0:
                raise SystemExit("Backup decryption failed.")

            with open(plaintext_file, "rb") as restore_input:
                restore_result = subprocess.run(
                    mysql_command,
                    stdin=restore_input,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                    env=mysql_environment,
                    check=False,
                )
            if restore_result.returncode != 0:
                raise SystemExit("Backup import into the isolated database failed.")

            quoted_tables = ", ".join(f"'{name}'" for name in REQUIRED_TABLES)
            verification_result = subprocess.run(
                mysql_command + [
                    "--batch", "--skip-column-names",
                    "--execute",
                    "SELECT COUNT(*) FROM information_schema.tables "
                    "WHERE table_schema = DATABASE() "
                    f"AND table_name IN ({quoted_tables});",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=mysql_environment,
                text=True,
                check=False,
            )
            if (
                verification_result.returncode != 0
                or verification_result.stdout.strip() != str(len(REQUIRED_TABLES))
            ):
                raise SystemExit("Restored database is missing required application tables.")
    except FileNotFoundError as error:
        executable = error.filename or "required command"
        raise SystemExit(f"{executable} is not installed or available on PATH.") from error

    elapsed_seconds = time.monotonic() - started_at
    print(f"Encrypted backup restored and structurally verified in {elapsed_seconds:.1f} seconds.")
    return elapsed_seconds


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("encrypted_file")
    parser.add_argument("--checksum-file")
    args = parser.parse_args()
    run_restore(args.encrypted_file, args.checksum_file)


if __name__ == "__main__":
    main()
