from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from core.models.events import BaseEvent, EventType


class WebSocketSink:
    def __init__(
        self,
        queue: Optional[asyncio.Queue[Dict[str, Any]]] = None,
        max_queue_size: int = 10000,
    ):
        self.queue: asyncio.Queue[Dict[str, Any]] = queue or asyncio.Queue(
            maxsize=max_queue_size
        )

    def handle(self, event: BaseEvent) -> None:
        if event.type in {EventType.PRICE_SNAPSHOT, EventType.SIGNAL}:
            return

        payload = event.to_wire()

        try:
            self.queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass
