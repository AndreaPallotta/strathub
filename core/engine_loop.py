from __future__ import annotations

import queue
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Type

from core.backtest.replayer import BacktestReplayer
from core.config import Config, load_strategy_config
from core.control.command_handler import ControlCommandHandler
from core.data.live_snapshot_builder import LiveSnapshotBuilder
from core.event_bus import EventBus
from core.execution.simulator import ExecutionSimulator, SimulatedFill
from core.models.events import (
    make_backtest_status_event,
    make_execution_event,
    make_log_event,
    make_metrics_event,
    make_position_update_event,
    make_price_snapshot_event,
    make_state_update_events,
    make_strategy_snapshot_event,
    make_strategy_status_event,
)
from core.models.snapshots import MarketSnapshot
from core.sinks.file_sink import FileSink
from core.sinks.multicast_sink import MulticastSink
from core.sinks.snapshot_recorder import SnapshotRecorderSink
from core.sinks.websocket_sink import WebSocketSink
from core.strategy_event_logger import StrategyEventLogger
from strategies.base import StrategyAction, StrategyBase


class Engine:
    def __init__(self, config: Config, strategies: Dict[str, Type[StrategyBase]]):
        self.config = config
        self.websocket_sink: Optional[WebSocketSink] = None
        self.multicast_sink: Optional[MulticastSink] = None

        self.event_bus = EventBus()

        sim_cfg = self.config.get("simulation", {}) or {}
        mode_cfg = self.config.get("mode", {}) or {}

        self._state_update_interval_secs: float = float(
            self.config.get("engine.state_update_interval_seconds", 5.0)
        )
        self._last_state_update_ts: float = time.monotonic()

        self.strategy_classes = strategies
        self.strategy_instances: Dict[str, StrategyBase] = {}
        self.enabled_strategies: Dict[str, StrategyBase] = {}

        self._running = False
        self.control_queue: queue.Queue[Dict[str, Any]] = queue.Queue()
        self._control_handler = ControlCommandHandler(self)

        self._mode = mode_cfg.get("type", "backtest")
        self._backtest_replayer: Optional[BacktestReplayer] = None
        self._live_snapshot_builder: Optional[LiveSnapshotBuilder] = None

        self._empty_snapshot_loops: int = 0
        self._empty_snapshot_warning_threshold: int = 5

        self._backtest_run_id: Optional[str] = None
        self._backtest_started_at_ms: Optional[int] = None

        if self._mode == "backtest":
            backtest_file = mode_cfg.get("backtest_file")
            if backtest_file:
                self._backtest_replayer = BacktestReplayer(
                    path=backtest_file,
                    repeat=bool(mode_cfg.get("backtest_repeat", False)),
                    batch_size=int(mode_cfg.get("backtest_batch_size", 1)),
                )
                self._backtest_run_id = f"backtest:{backtest_file}"

        if self._mode == "live":
            self._live_snapshot_builder = LiveSnapshotBuilder(self.config.raw)

        self._simulator = ExecutionSimulator(sim_cfg)

        self._setup_sinks()
        self._load_strategies()

    def _setup_sinks(self) -> None:
        log_dir = self.config.get("logging.file.dir_name", "logs")
        base_filename = self.config.get("logging.file.base_filename", "events")
        rotate_daily = bool(self.config.get("logging.file.rotate_daily", True))

        if self.config.get("logging.file.enabled", False):
            print("Enabled file sink")
            file_sink = FileSink(
                log_dir=log_dir, base_filename=base_filename, rotate_daily=rotate_daily
            )
            self.event_bus.add_sink(file_sink)

        ws_cfg = self.config.get("logging.websocket", {}) or {}
        if ws_cfg.get("enabled", False):
            print("Enabled websocket sink")
            ws_sink = WebSocketSink()
            self.event_bus.add_sink(ws_sink)
            self.websocket_sink = ws_sink

        mc_cfg = self.config.get("logging.multicast", {}) or {}
        if mc_cfg.get("enabled", False):
            print("Enabled multicast sink")
            group = mc_cfg.get("group", "239.0.0.1")
            port = int(mc_cfg.get("port", 5000))
            ttl = int(mc_cfg.get("ttl", 1))
            mc_filter_cfg = mc_cfg.get("filter", {}) or {}
            mc_include_types = mc_filter_cfg.get("include_types")
            mc_sink = MulticastSink(
                group=group, port=port, ttl=ttl, include_types=mc_include_types
            )
            self.event_bus.add_sink(mc_sink)
            self.multicast_sink = mc_sink

        snap_cfg = self.config.get("logging.snapshot_recorder", {}) or {}
        if snap_cfg.get("enabled", False) and self._mode == "live":
            snap_file = snap_cfg.get("file", "data/backtests/live_capture.ndjson")
            snap_sink = SnapshotRecorderSink(snap_file)
            self.event_bus.add_sink(snap_sink)

    def _load_strategies(self) -> None:
        for strat_id, strat_cls in self.strategy_classes.items():
            strat_cfg = load_strategy_config(strat_id) or {}
            enabled_by_default = bool(strat_cfg.get("enabled_by_default", False))
            logger = self._make_strategy_logger(strat_id)
            instance = strat_cls(
                strategy_id=strat_id,
                config=strat_cfg,
                logger=logger,
            )
            instance.enabled_by_default = enabled_by_default  # type: ignore[attr-defined]
            self.strategy_instances[strat_id] = instance

    def _make_strategy_logger(self, strat_id: str) -> StrategyEventLogger:
        return StrategyEventLogger(strategy_id=strat_id, event_bus=self.event_bus)

    def _build_strategy_snapshot_data(self) -> List[Dict[str, Any]]:
        strategies: List[Dict[str, Any]] = []
        for sid, strat in self.strategy_instances.items():
            enabled = sid in self.enabled_strategies
            cfg = getattr(strat, "config", {}) or {}
            name = cfg.get("name", sid)
            strategies.append(
                {
                    "id": sid,
                    "name": name,
                    "enabled": enabled,
                }
            )
        return strategies

    def start(self) -> None:
        self._running = True

        for strat_id, strat in self.strategy_instances.items():
            enabled = getattr(strat, "enabled_by_default", False)
            if enabled:
                strat.on_start()
                self.enabled_strategies[strat_id] = strat
                cfg = getattr(strat, "config", {}) or {}
                name = cfg.get("name", strat_id)
                self.event_bus.publish(
                    make_strategy_status_event(
                        strategy_id=strat_id,
                        enabled=True,
                        name=name,
                    )
                )

        self.event_bus.publish(
            make_strategy_snapshot_event(self._build_strategy_snapshot_data())
        )

        self.event_bus.publish(make_metrics_event())
        self.event_bus.publish(
            make_log_event(
                level="INFO",
                message="Engine started",
                extra={"mode": self._mode},
            )
        )

        if self._mode == "backtest":
            ts = datetime.now(timezone.utc)
            epoch_ms = int(ts.timestamp() * 1000)
            self._backtest_started_at_ms = epoch_ms
            if self._backtest_run_id is None:
                self._backtest_run_id = "backtest:unknown"
            self.event_bus.publish(
                make_backtest_status_event(
                    backtest_id=self._backtest_run_id,
                    strategy_id="__engine__",
                    status="running",
                    started_at=self._backtest_started_at_ms,
                    finished_at=None,
                    error=None,
                )
            )

        try:
            self._main_loop()
        finally:
            self._shutdown()

    def stop(self) -> None:
        self._running = False

    def _shutdown(self) -> None:
        for strat_id, strat in list(self.enabled_strategies.items()):
            try:
                strat.on_stop()
            except Exception:
                pass
            cfg = getattr(strat, "config", {}) or {}
            name = cfg.get("name", strat_id)
            self.event_bus.publish(
                make_strategy_status_event(
                    strategy_id=strat_id,
                    enabled=False,
                    name=name,
                )
            )

        self.enabled_strategies.clear()

        self.event_bus.publish(
            make_strategy_snapshot_event(self._build_strategy_snapshot_data())
        )

        if self._mode == "backtest" and self._backtest_run_id is not None:
            ts = datetime.now(timezone.utc)
            epoch_ms = int(ts.timestamp() * 1000)
            self.event_bus.publish(
                make_backtest_status_event(
                    backtest_id=self._backtest_run_id,
                    strategy_id="__engine__",
                    status="done",
                    started_at=self._backtest_started_at_ms,
                    finished_at=epoch_ms,
                    error=None,
                )
            )

        self.event_bus.publish(
            make_log_event(
                level="INFO",
                message="Engine stopped",
                extra={"mode": self._mode},
            )
        )

    def _main_loop(self) -> None:
        poll_interval = self.config.get("sources.odds.poll_interval_seconds", 30)

        while self._running:
            snapshots: List[MarketSnapshot] = self._get_snapshots()

            if snapshots:
                self._empty_snapshot_loops = 0
            else:
                self._empty_snapshot_loops += 1
                if self._empty_snapshot_loops == self._empty_snapshot_warning_threshold:
                    self.event_bus.publish(
                        make_log_event(
                            level="WARN",
                            message="No snapshots received for several loops",
                            extra={
                                "loops": self._empty_snapshot_loops,
                                "mode": self._mode,
                            },
                        )
                    )

            for snapshot in snapshots:
                event = make_price_snapshot_event(
                    snapshot_id=snapshot.snapshot_id,
                    kalshi_ticker=snapshot.kalshi_ticker,
                    extra={"snapshot": snapshot.to_dict()},
                )
                self.event_bus.publish(event)

                for strat_id, strat in self.enabled_strategies.items():
                    if not self._should_route_snapshot_to_strategy(strat, snapshot):
                        continue

                    self._simulator.update_mark(strat_id, snapshot)

                    try:
                        actions = strat.on_market_snapshot(snapshot)
                    except Exception as e:
                        self.event_bus.publish(
                            make_log_event(
                                level="ERROR",
                                message="Strategy on_market_snapshot failed",
                                extra={
                                    "strategy_id": strat_id,
                                    "error": repr(e),
                                },
                            )
                        )
                        continue

                    self._handle_actions(strat_id, actions, snapshot)

            self._drain_control_queue()

            now = time.monotonic()
            if now - self._last_state_update_ts >= self._state_update_interval_secs:
                self._publish_all_states()
                self.event_bus.publish(make_metrics_event())
                self._last_state_update_ts = now

            try:
                time.sleep(poll_interval)
            except KeyboardInterrupt:
                raise

    def _get_snapshots(self) -> List[MarketSnapshot]:
        if self._mode == "backtest" and self._backtest_replayer is not None:
            return self._backtest_replayer.next_batch()
        if self._mode == "live" and self._live_snapshot_builder is not None:
            return self._live_snapshot_builder.build_snapshots()
        return []

    def _handle_actions(
        self, strat_id: str, actions: List[StrategyAction], snapshot: MarketSnapshot
    ) -> None:
        if not actions:
            return

        fills: List[SimulatedFill] = self._simulator.simulate_actions(
            strat_id, actions, snapshot
        )

        for fill in fills:
            self.event_bus.publish(
                make_execution_event(
                    strategy_id=fill.strategy_id,
                    kalshi_ticker=fill.kalshi_ticker,
                    action_type=fill.action_type,
                    side=fill.side,
                    size=fill.size,
                    price=fill.price,
                    reason=fill.reason,
                    extra=fill.meta,
                )
            )

        if not fills:
            return

        state = self._simulator.get_strategy_state(strat_id)
        strat_state_id = state["strategy_id"]
        strat_state = state["state"]

        for ev in make_state_update_events(
            strategy_id=strat_state_id,
            state=strat_state,
        ):
            self.event_bus.publish(ev)

        positions_dict: Dict[str, Dict[str, Any]] = strat_state.get("positions") or {}
        for fill in fills:
            pos = positions_dict.get(fill.kalshi_ticker) or {
                "instrument": fill.kalshi_ticker,
                "size": 0,
                "avg_price": 0.0,
                "unrealized_pnl": 0.0,
            }
            self.event_bus.publish(make_position_update_event(strat_state_id, pos))

    def _drain_control_queue(self) -> None:
        while True:
            try:
                cmd = self.control_queue.get_nowait()
            except queue.Empty:
                break

            try:
                self._control_handler.handle(cmd)
            except Exception as exc:
                self.event_bus.publish(
                    make_log_event(
                        level="ERROR",
                        message="Error handling control command",
                        extra={"error": str(exc), "command": cmd},
                    )
                )

    def _should_route_snapshot_to_strategy(
        self,
        strategy: StrategyBase,
        snapshot: MarketSnapshot,
    ) -> bool:
        cfg = getattr(strategy, "config", {}) or {}
        markets = cfg.get("markets", {}) or {}

        sports = markets.get("sports")
        if sports and snapshot.sport_key not in sports:
            return False

        event_ids = markets.get("event_ids")
        if event_ids and snapshot.event_id not in event_ids:
            return False

        kalshi_tickers = markets.get("kalshi_tickers")
        if kalshi_tickers and snapshot.kalshi_ticker not in kalshi_tickers:
            return False

        return True

    def _publish_all_states(self) -> None:
        for strat_id in self.enabled_strategies.keys():
            state = self._simulator.get_strategy_state(strat_id)
            strat_state_id = state["strategy_id"]
            strat_state = state["state"]
            for ev in make_state_update_events(
                strategy_id=strat_state_id,
                state=strat_state,
            ):
                self.event_bus.publish(ev)
