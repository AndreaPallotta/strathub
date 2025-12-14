from __future__ import annotations

from typing import List, Protocol

from core.models.events import BaseEvent


class EventSink(Protocol):
    def handle(self, event: BaseEvent) -> None: ...


class EventBus:
    def __init__(self, sinks: List[EventSink] | None = None):
        self._sinks: List[EventSink] = sinks or []

    def add_sink(self, sink: EventSink) -> None:
        self._sinks.append(sink)

    def publish(self, event: BaseEvent) -> None:
        for sink in self._sinks:
            try:
                sink.handle(event)
            except Exception:
                print(f"[{sink}] QUEUE IS FULL")
                pass
