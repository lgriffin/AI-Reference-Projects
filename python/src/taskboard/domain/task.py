"""Domain: a task, and the rule for how its status may change. Pure; no I/O."""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import StrEnum
from uuid import uuid4

from taskboard.domain.errors import InvalidTransition


class Status(StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


TRANSITIONS: dict[Status, frozenset[Status]] = {
    Status.TODO: frozenset({Status.IN_PROGRESS}),
    Status.IN_PROGRESS: frozenset({Status.TODO, Status.DONE}),
    Status.DONE: frozenset(),
}


@dataclass(frozen=True)
class Task:
    id: str
    title: str
    status: Status = Status.TODO

    @staticmethod
    def new(title: str) -> Task:
        return Task(id=str(uuid4()), title=title)

    def move_to(self, status: Status) -> Task:
        if status not in TRANSITIONS[self.status]:
            raise InvalidTransition(self.status, status)
        return replace(self, status=status)
