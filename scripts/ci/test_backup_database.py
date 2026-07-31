"""Security regression tests for the encrypted database backup script."""

import hashlib
import os
import subprocess
import tempfile
import unittest
from unittest import mock

import backup_database


class BackupDatabaseTest(unittest.TestCase):
    def test_backup_keeps_only_encrypted_artifact(self):
        settings = {
            "DB_HOST": "db.example.test",
            "DB_PORT": "3306",
            "DB_USER": "backup-user",
            "DB_PASSWORD": "database-password",
            "DB_NAME": "toub_pos",
            "BACKUP_ENCRYPTION_PASSPHRASE": "long-test-passphrase-value",
        }
        plaintext_paths = []
        command_arguments = []

        def fake_run(command, **kwargs):
            command_arguments.append(command)
            if command[0] == "mysqldump":
                kwargs["stdout"].write("-- synthetic test dump\n")
                plaintext_paths.append(kwargs["stdout"].name)
                return subprocess.CompletedProcess(command, 0, "", "")

            encrypted_path = command[command.index("--output") + 1]
            plaintext_path = command[-1]
            self.assertTrue(os.path.exists(plaintext_path))
            with open(encrypted_path, "wb") as encrypted_file:
                encrypted_file.write(b"encrypted-test-content")
            return subprocess.CompletedProcess(command, 0, "", "")

        with tempfile.TemporaryDirectory() as output_dir:
            with mock.patch.object(backup_database, "BACKUP_DIR", output_dir), mock.patch.object(
                backup_database, "load_env", return_value=settings
            ), mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(
                backup_database.subprocess, "run", side_effect=fake_run
            ):
                encrypted_path = backup_database.run_backup()

            self.assertTrue(encrypted_path.endswith(".sql.gpg"))
            self.assertTrue(os.path.exists(encrypted_path))
            checksum_path = f"{encrypted_path}.sha256"
            self.assertTrue(os.path.exists(checksum_path))
            with open(checksum_path, "r", encoding="utf-8") as checksum_file:
                self.assertEqual(
                    checksum_file.read().strip(),
                    f"{hashlib.sha256(b'encrypted-test-content').hexdigest()}  "
                    f"{os.path.basename(encrypted_path)}",
                )
            self.assertTrue(plaintext_paths)
            self.assertFalse(os.path.exists(plaintext_paths[0]))
            self.assertNotIn(settings["BACKUP_ENCRYPTION_PASSPHRASE"], str(command_arguments))
            self.assertIn("--set-gtid-purged=OFF", command_arguments[0])
            self.assertIn("--no-tablespaces", command_arguments[0])

    def test_backup_requires_encryption_passphrase(self):
        settings = {
            "DB_HOST": "db.example.test",
            "DB_PORT": "3306",
            "DB_USER": "backup-user",
            "DB_PASSWORD": "database-password",
            "DB_NAME": "toub_pos",
        }

        with mock.patch.object(backup_database, "load_env", return_value=settings), mock.patch.dict(
            os.environ, {}, clear=True
        ):
            with self.assertRaisesRegex(SystemExit, "BACKUP_ENCRYPTION_PASSPHRASE"):
                backup_database.run_backup()


if __name__ == "__main__":
    unittest.main()
