"""Domain: every way a request can break a business rule. No HTTP in here."""


class DomainError(Exception):
    code: str


class TaskNotFound(DomainError):
    code = "task_not_found"

    def __init__(self, task_id: str) -> None:
        super().__init__(f"Task '{task_id}' does not exist.")


class InvalidTransition(DomainError):
    code = "invalid_transition"

    def __init__(self, current: str, requested: str) -> None:
        super().__init__(f"A task cannot move from '{current}' to '{requested}'.")


class WipLimitExceeded(DomainError):
    code = "wip_limit_exceeded"

    def __init__(self, limit: int) -> None:
        super().__init__(f"No more than {limit} tasks may be in progress at once.")
