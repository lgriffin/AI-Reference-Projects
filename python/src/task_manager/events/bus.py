"""Pattern 7 -- Event-Driven Communication (event bus).

A lightweight, in-process, async event bus.  Services publish domain
events; handlers subscribe by event type.  This decouples features
that react to domain changes (notifications, audit logs, statistics)
from the command that triggered them.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Awaitable, Callable

from task_manager.domain.events import DomainEvent

# Handler signature: receives a single DomainEvent subclass instance
EventHandler = Callable[..., Awaitable[None]]

logger = logging.getLogger(__name__)


class EventBus:
    """Simple publish/subscribe event bus using asyncio."""

    def __init__(self) -> None:
        self._handlers: dict[type[DomainEvent], list[EventHandler]] = defaultdict(list)

    def subscribe(
        self,
        event_type: type[DomainEvent],
        handler: EventHandler,
    ) -> None:
        """Register *handler* to be called whenever *event_type* is published."""
        self._handlers[event_type].append(handler)

    async def publish(self, event: DomainEvent) -> None:
        """Dispatch *event* to all registered handlers concurrently."""
        handlers = self._handlers.get(type(event), [])
        if not handlers:
            return
        results = await asyncio.gather(
            *(h(event) for h in handlers),
            return_exceptions=True,
        )
        for i, result in enumerate(results):
            if isinstance(result, BaseException):
                logger.error(
                    "Event handler %s failed for %s: %s",
                    handlers[i].__name__,
                    type(event).__name__,
                    result,
                )
