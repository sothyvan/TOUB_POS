"""Create an encrypted TouB POS MySQL backup outside source control.

The script reads settings from process environment variables first and falls
back to backend/.env for local operations. It writes the mysqldump plaintext to
an operating-system temporary directory and keeps only an AES-256 encrypted
``.sql.gpg`` artifact under ``backups/``.
"""

import datetime
import os
import subprocess
import tempfile


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(SCRIPT_DIR, "backend", ".env")
BACKUP_DIR = os.path.join(SCRIPT_DIR, "backups")


def load_env(filepath: str) -> dict:
    """Read the small KEY=VALUE subset needed by the local backup command."""
    if not os.path.exists(filepath):
        return {}

    values = {}
    with open(filepath, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


def get_setting(file_env: dict, name: str, default=None):
    """Prefer CI/host environment variables over the optional local .env."""
    return os.environ.get(name) or file_env.get(name, default)


def require_settings(settings: dict) -> None:
    missing = [name for name, value in settings.items() if not value]
    if missing:
        raise SystemExit(
            "Missing required backup settings: " + ", ".join(sorted(missing))
        )


def run_backup() -> str:
    """Create an encrypted backup and return its final path."""
    file_env = load_env(ENV_FILE)
    settings = {
        "DB_HOST": get_setting(file_env, "DB_HOST"),
        "DB_PORT": get_setting(file_env, "DB_PORT", "3306"),
        "DB_USER": get_setting(file_env, "DB_USER"),
        "DB_PASSWORD": get_setting(file_env, "DB_PASSWORD"),
        "DB_NAME": get_setting(file_env, "DB_NAME"),
        "BACKUP_ENCRYPTION_PASSPHRASE": get_setting(
            file_env, "BACKUP_ENCRYPTION_PASSPHRASE"
        ),
    }
    require_settings(settings)

    passphrase = settings["BACKUP_ENCRYPTION_PASSPHRASE"]
    if len(passphrase) < 20 or "\n" in passphrase or "\r" in passphrase:
        raise SystemExit(
            "BACKUP_ENCRYPTION_PASSPHRASE must be at least 20 characters "
            "and contain no line breaks."
        )

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%d_%H-%M-%S_UTC"
    )
    base_name = f"{settings['DB_NAME']}_backup_{timestamp}.sql"
    encrypted_file = os.path.join(BACKUP_DIR, f"{base_name}.gpg")

    dump_environment = os.environ.copy()
    dump_environment["MYSQL_PWD"] = settings["DB_PASSWORD"]
    dump_command = [
        "mysqldump",
        f"--host={settings['DB_HOST']}",
        f"--port={settings['DB_PORT']}",
        f"--user={settings['DB_USER']}",
        "--single-transaction",
        "--routines",
        "--triggers",
        settings["DB_NAME"],
    ]

    try:
        with tempfile.TemporaryDirectory(prefix="toub-pos-backup-") as temp_dir:
            plaintext_file = os.path.join(temp_dir, base_name)
            with open(plaintext_file, "w", encoding="utf-8") as output:
                dump_result = subprocess.run(
                    dump_command,
                    stdout=output,
                    stderr=subprocess.PIPE,
                    env=dump_environment,
                    text=True,
                    check=False,
                )

            if dump_result.returncode != 0:
                raise SystemExit(
                    "mysqldump failed. Review database connectivity and "
                    "credentials in the protected workflow logs."
                )

            encryption_result = subprocess.run(
                [
                    "gpg",
                    "--batch",
                    "--yes",
                    "--pinentry-mode",
                    "loopback",
                    "--passphrase-fd",
                    "0",
                    "--symmetric",
                    "--cipher-algo",
                    "AES256",
                    "--output",
                    encrypted_file,
                    plaintext_file,
                ],
                input=f"{passphrase}\n",
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )

            if encryption_result.returncode != 0:
                if os.path.exists(encrypted_file):
                    os.remove(encrypted_file)
                raise SystemExit(
                    "Backup encryption failed. No plaintext backup was retained."
                )
    except FileNotFoundError as error:
        executable = error.filename or "required command"
        raise SystemExit(f"{executable} is not installed or available on PATH.") from error

    size_kb = os.path.getsize(encrypted_file) / 1024
    print(
        f"Encrypted backup created: {os.path.basename(encrypted_file)} "
        f"({size_kb:.1f} KB)"
    )
    return encrypted_file


if __name__ == "__main__":
    run_backup()
