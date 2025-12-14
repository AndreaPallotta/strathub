from __future__ import annotations

import json
import socket
from typing import Iterable, Optional, Set

from core.models.events import BaseEvent, EventType


class MulticastSink:
    def __init__(
        self,
        group: str,
        port: int,
        ttl: int = 1,
        include_types: Optional[Iterable[str]] = None,
    ):
        self.group = group
        self.port = port
        self._include_types = None

        self._socket = socket.socket(
            socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP
        )
        self._socket.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)

        if include_types is not None:
            include: Set[EventType] = set()
            for t in include_types:
                if isinstance(t, EventType):
                    include.add(t)
                elif isinstance(t, str):
                    try:
                        include.add(EventType(t))
                        continue
                    except ValueError:
                        pass

                    try:
                        include.add(EventType(f"StratHub.{t}"))
                        continue
                    except ValueError:
                        pass
            self._include_types: Optional[Set[EventType]] = include

    def handle(self, event: BaseEvent) -> None:
        if self._include_types is not None and event.type not in self._include_types:
            return

        payload = event.to_dict()
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")

        try:
            self._socket.sendto(data, (self.group, self.port))
        except OSError:
            pass
