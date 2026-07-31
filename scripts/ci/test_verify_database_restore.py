"""Regression tests for isolated encrypted-backup restore verification."""

import hashlib
import os
import subprocess
import tempfile
import unittest
from unittest import mock

import verify_database_restore


class VerifyDatabaseRestoreTest(unittest.TestCase):
    def test_restore_verifies_checksum_imports_and_cleans_plaintext(self):
        plaintext_paths = []
        commands = []

        def fake_run(command, **kwargs):
            commands.append(command)
            if command[0] == "gpg":
                plaintext_path = command[command.index("--output") + 1]
                plaintext_paths.append(plaintext_path)
                with open(plaintext_path, "wb") as plaintext_file:
                    plaintext_file.write(b"-- synthetic restore\n")
                return subprocess.CompletedProcess(command, 0, "", "")
            if "--execute" in command:
                return subprocess.CompletedProcess(command, 0, "5\n", "")
            return subprocess.CompletedProcess(command, 0, b"", b"")

        settings = {
            "BACKUP_ENCRYPTION_PASSPHRASE": "long-test-passphrase-value",
            "RESTORE_DB_HOST": "127.0.0.1",
            "RESTORE_DB_PORT": "3306",
            "RESTORE_DB_USER": "root",
            "RESTORE_DB_PASSWORD": "restore-password",
            "RESTORE_DB_NAME": "toub_pos_restore",
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            encrypted_path = os.path.join(temp_dir, "backup.sql.gpg")
            encrypted_content = b"encrypted-test-content"
            with open(encrypted_path, "wb") as encrypted_file:
                encrypted_file.write(encrypted_content)
            with open(f"{encrypted_path}.sha256", "w", encoding="utf-8") as checksum_file:
                checksum_file.write(
                    f"{hashlib.sha256(encrypted_content).hexdigest()}  "
                    f"{os.path.basename(encrypted_path)}\n"
                )

            with mock.patch.dict(os.environ, settings, clear=True), mock.patch.object(
                verify_database_restore.subprocess, "run", side_effect=fake_run
            ):
                verify_database_restore.run_restore(encrypted_path)

        self.assertEqual([command[0] for command in commands], ["gpg", "mysql", "mysql"])
        self.assertTrue(plaintext_paths)
        self.assertFalse(os.path.exists(plaintext_paths[0]))

    def test_restore_rejects_a_corrupted_encrypted_artifact(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            encrypted_path = os.path.join(temp_dir, "backup.sql.gpg")
            with open(encrypted_path, "wb") as encrypted_file:
                encrypted_file.write(b"corrupted-content")
            with open(f"{encrypted_path}.sha256", "w", encoding="utf-8") as checksum_file:
                checksum_file.write(f"{'0' * 64}  {os.path.basename(encrypted_path)}\n")

            with self.assertRaisesRegex(SystemExit, "checksum verification failed"):
                verify_database_restore.run_restore(encrypted_path)


if __name__ == "__main__":
    unittest.main()
