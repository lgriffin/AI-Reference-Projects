"""Events: side effects live here, one small function per reaction."""

import logging

from taskboard.domain.events import TaskCompleted

logger = logging.getLogger(__name__)


def announce_completion(event: TaskCompleted) -> None:
    """Stands in for an e-mail or chat notification."""
    logger.info("Task completed: %s (%s)", event.title, event.task_id)
