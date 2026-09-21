"""Domain: facts that other parts of the system may react to. Immutable."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TaskCompleted:
    task_id: str
    title: str
