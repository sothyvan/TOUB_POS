"""
TOUB POS — Database Backup Script
----------------------------------
Reads your DB credentials directly from backend/.env,
then runs mysqldump to produce a timestamped .sql backup file.

Usage:
    python backup_database.py

Requirements:
    - Python 3.x (stdlib only, no pip installs needed)
    - mysqldump installed  → sudo apt install mysql-client
"""

import os
import subprocess
import datetime

# ── 1. Find and read backend/.env ────────────────────────────────────────────

# This script lives in the project root, so .env is one folder down.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE   = os.path.join(SCRIPT_DIR, "backend", ".env")


def load_env(filepath: str) -> dict:
    """
    Parse a .env file into a plain dict.
    Ignores blank lines and comments (lines starting with #).
    """
    env = {}
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            # Skip blank lines and comments
            if not line or line.startswith("#"):
                continue
            # Split on the FIRST '=' only, handles values that contain '='
            if "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


# ── 2. Extract DB credentials ─────────────────────────────────────────────────

env = load_env(ENV_FILE)

DB_HOST     = env.get("DB_HOST", "localhost")
DB_PORT     = env.get("DB_PORT", "3306")
DB_USER     = env.get("DB_USER", "root")
DB_PASSWORD = env.get("DB_PASSWORD", "")
DB_NAME     = env.get("DB_NAME", "toub_pos")


# ── 3. Build output filename with a timestamp ─────────────────────────────────

BACKUP_DIR = os.path.join(SCRIPT_DIR, "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)   # creates ./backups/ if it doesn't exist

timestamp   = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
output_file = os.path.join(BACKUP_DIR, f"{DB_NAME}_backup_{timestamp}.sql")


# ── 4. Run mysqldump ──────────────────────────────────────────────────────────

# We pass the password via the MYSQL_PWD environment variable instead of
# using the -p flag, which would expose it in the process list.
dump_env = os.environ.copy()
dump_env["MYSQL_PWD"] = DB_PASSWORD

command = [
    "mysqldump",
    f"--host={DB_HOST}",
    f"--port={DB_PORT}",
    f"--user={DB_USER}",
    "--single-transaction",   # consistent snapshot without locking tables
    "--routines",             # include stored procedures & functions
    "--triggers",             # include triggers
    DB_NAME,
]

print(f"[+] Connecting to  : {DB_USER}@{DB_HOST}:{DB_PORT}")
print(f"[+] Database       : {DB_NAME}")
print(f"[+] Output file    : {output_file}")
print("[+] Running mysqldump ...")

try:
    with open(output_file, "w") as out_file:
        result = subprocess.run(
            command,
            stdout=out_file,      # dump goes straight into the file
            stderr=subprocess.PIPE,
            env=dump_env,
            text=True,
        )

    if result.returncode != 0:
        # mysqldump prints errors to stderr
        print("\n[✗] Backup FAILED:")
        print(result.stderr)
        # Remove the empty/partial file so it isn't mistaken for a good backup
        os.remove(output_file)
    else:
        size_kb = os.path.getsize(output_file) / 1024
        print(f"[✓] Backup complete! File size: {size_kb:.1f} KB")

except FileNotFoundError:
    print("\n[✗] 'mysqldump' not found.")
    print("    Install it with:  sudo apt install mysql-client")
