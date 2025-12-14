from __future__ import annotations

import asyncio
import json
import queue as q
import threading
from dataclasses import dataclass
from typing import Any, Dict, Optional

from websockets.legacy.server import WebSocketServerProtocol, serve


@dataclass
class WSConfig:
    host: str = "127.0.0.1"
    port: int = 8765
    path: str = "/ws/engine"


class ConnectionManager:
    def __init__(self) -> None:
        self._clients: set[WebSocketServerProtocol] = set()
        self._lock = asyncio.Lock()

    async def register(self, ws: WebSocketServerProtocol) -> None:
        async with self._lock:
            self._clients.add(ws)

    async def unregister(self, ws: WebSocketServerProtocol) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def broadcast_json(self, payload: Dict[str, Any]) -> None:
        async with self._lock:
            if not self._clients:
                return

            message = json.dumps(payload, separators=(",", ":"))
            clients = list(self._clients)

        if not clients:
            return

        tasks = [self._safe_send(ws, message) for ws in clients]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_send(self, ws: WebSocketServerProtocol, message: str) -> None:
        try:
            await ws.send(message)
        except Exception:
            try:
                await ws.close()
            except Exception:
                pass
            async with self._lock:
                self._clients.discard(ws)


class WebSocketServer:
    def __init__(
        self,
        queue: asyncio.Queue[Dict[str, Any]],
        config: WSConfig,
        control_queue: Optional[q.Queue[Dict[str, Any]]],
    ) -> None:
        self.queue = queue
        self.config = config
        self._conn_mgr = ConnectionManager()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._running: bool = False
        self._control_queue = control_queue

    def start_in_background(self) -> None:
        if self._thread is not None:
            return

        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False

        if self._loop is not None:

            def _wakeup() -> None:
                try:
                    self.queue.put_nowait({"__sentinel__": True})
                except Exception:
                    pass

            self._loop.call_soon_threadsafe(_wakeup)

        if self._thread is not None:
            self._thread.join(timeout=2.0)

    def _run_loop(self) -> None:
        loop = asyncio.new_event_loop()
        self._loop = loop
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(self._main())
        finally:
            pending = asyncio.all_tasks(loop=loop)
            for task in pending:
                task.cancel()
            if pending:
                try:
                    loop.run_until_complete(
                        asyncio.gather(*pending, return_exceptions=True)
                    )
                except Exception:
                    pass
            loop.close()

    async def _main(self) -> None:
        async def handler(ws: WebSocketServerProtocol, path: str) -> None:
            if path != self.config.path:
                await ws.close(code=1008, reason="Invalid path")
                return

            await self._conn_mgr.register(ws)
            try:
                async for msg in ws:
                    if self._control_queue is None:
                        continue
                    try:
                        data = json.loads(msg)
                    except Exception:
                        continue

                    if not isinstance(data, dict):
                        continue

                    if data.get("type") != "StratHub.Command":
                        continue

                    try:
                        self._control_queue.put_nowait(data)
                    except Exception:
                        pass

            finally:
                await self._conn_mgr.unregister(ws)

        server = await serve(
            handler,
            self.config.host,
            self.config.port,
        )

        try:
            broadcaster_task = asyncio.create_task(self._broadcaster())
            await broadcaster_task
        finally:
            server.close()
            await server.wait_closed()

    async def _broadcaster(self) -> None:
        while self._running:
            try:
                payload = await self.queue.get()
            except asyncio.CancelledError:
                break

            if isinstance(payload, dict) and payload.get("__sentinel__"):
                break

            try:
                await self._conn_mgr.broadcast_json(payload)
            except Exception:
                pass
