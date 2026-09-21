"""Repositories: TaskRepository on SQLite. The only module that speaks SQL."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from taskboard.domain.task import Status, Task

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id     TEXT PRIMARY KEY,
    title  TEXT NOT NULL,
    status TEXT NOT NULL
)
"""

UPSERT = """
INSERT INTO tasks (id, title, status) VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET title = excluded.title, status = excluded.status
"""


class SqliteTaskRepository:
    def __init__(self, database_path: str) -> None:
        self._path = database_path
        with self._connect() as db:
            db.execute(SCHEMA)

    def save(self, task: Task) -> None:
        with self._connect() as db:
            db.execute(UPSERT, (task.id, task.title, task.status))

    def find(self, task_id: str) -> Task | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT id, title, status FROM tasks WHERE id = ?", (task_id,)
            ).fetchone()
        return _to_task(row) if row else None

    def find_all(self) -> list[Task]:
        with self._connect() as db:
            rows = db.execute("SELECT id, title, status FROM tasks ORDER BY rowid").fetchall()
        return [_to_task(row) for row in rows]

    def count_by_status(self, status: Status) -> int:
        with self._connect() as db:
            (count,) = db.execute(
                "SELECT COUNT(*) FROM tasks WHERE status = ?", (status,)
            ).fetchone()
        return int(count)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self._path)
        try:
            with db:  # commit on success, roll back on error
                yield db
        finally:
            db.close()


def _to_task(row: tuple[str, str, str]) -> Task:
    return Task(id=row[0], title=row[1], status=Status(row[2]))
