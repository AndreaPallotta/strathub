from queue import Queue
from typing import Any, Dict

from core.config import load_config
from core.control.ws_server import WebSocketServer, WSConfig
from core.engine_loop import Engine
from core.sinks.websocket_sink import WebSocketSink
from core.strategy_loader import discover_strategies


def start_ws_server(
    ws_cfg: Dict[str, Any],
    sink: WebSocketSink | None,
    control_queue: Queue[Dict[str, Any]],
):
    if not ws_cfg.get("enabled", False) or not sink:
        return

    ws_config = WSConfig(
        host=ws_cfg.get("host", "127.0.0.1"),
        port=int(ws_cfg.get("port", 8765)),
        path=ws_cfg.get("path", "/ws/engine"),
    )
    ws_server = WebSocketServer(
        queue=sink.queue, config=ws_config, control_queue=control_queue
    )
    ws_server.start_in_background()
    print(
        f"[StratHub] WebSocket events server running on "
        f"ws://{ws_config.host}:{ws_config.port}{ws_config.path}"
    )

    return ws_server


def main():
    config = load_config("config/strathub.yaml")
    strategy_registry = discover_strategies()

    engine = Engine(config=config, strategies=strategy_registry)

    ws_server = start_ws_server(
        config.get("logging.websocket", {}), engine.websocket_sink, engine.control_queue
    )

    try:
        print("\n[StratHub] Starting engine...")
        engine.start()
        engine.websocket_sink
    except KeyboardInterrupt:
        print("\n[StratHub] Caught KeyboardInterrupt, shutting down gracefully...")
        engine.stop()
    finally:
        if ws_server is not None:
            ws_server.stop()
            print("[StratHub] WebSocket server stopped.")


if __name__ == "__main__":
    main()
