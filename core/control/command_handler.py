from __future__ import annotations

from typing import Any, Callable, Dict

from core.models.events import (
    make_log_event,
    make_state_update_events,
    make_strategy_snapshot_event,
    make_strategy_status_event,
)


class ControlCommandHandler:
    def __init__(self, engine: "Engine") -> None:  # type: ignore # noqa: F821
        self._engine = engine
        self._handlers: Dict[str, Callable[[Dict[str, Any]], None]] = {
            "start_strategy": self._cmd_start_strategy,
            "stop_strategy": self._cmd_stop_strategy,
            "update_params": self._cmd_update_params,
            "request_state": self._cmd_request_state,
        }

    def handle(self, cmd: Dict[str, Any]) -> None:
        if cmd.get("type") != "StratHub.Command":
            return

        command_name = cmd.get("command")
        if not command_name:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="Control command missing 'command' field",
                    extra={"command": cmd},
                )
            )
            return

        handler = self._handlers.get(command_name)
        if handler is None:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="Unknown control command",
                    extra={"command": cmd},
                )
            )
            return

        handler(cmd)

    def _cmd_start_strategy(self, cmd: Dict[str, Any]) -> None:
        strategy_id = cmd.get("strategy_id")
        if not strategy_id:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="start_strategy missing strategy_id",
                    extra={"command": cmd},
                )
            )
            return

        strat = self._engine.strategy_instances.get(strategy_id)
        if strat is None:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="start_strategy: unknown strategy_id",
                    extra={"strategy_id": strategy_id},
                )
            )
            return

        if strategy_id in self._engine.enabled_strategies:
            self._engine.event_bus.publish(
                make_log_event(
                    level="DEBUG",
                    message="start_strategy: strategy already enabled",
                    extra={"strategy_id": strategy_id},
                )
            )
            return

        strat.on_start()
        self._engine.enabled_strategies[strategy_id] = strat

        cfg = getattr(strat, "config", {}) or {}
        name = cfg.get("name", strategy_id)

        self._engine.event_bus.publish(
            make_strategy_status_event(
                strategy_id=strategy_id,
                enabled=True,
                name=name,
            )
        )

        self._engine.event_bus.publish(
            make_strategy_snapshot_event(self._engine._build_strategy_snapshot_data())
        )

        self._engine.event_bus.publish(
            make_log_event(
                level="INFO",
                message="Strategy started via control",
                extra={"strategy_id": strategy_id},
            )
        )

    def _cmd_stop_strategy(self, cmd: Dict[str, Any]) -> None:
        strategy_id = cmd.get("strategy_id")
        if not strategy_id:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="stop_strategy missing strategy_id",
                    extra={"command": cmd},
                )
            )
            return

        strat = self._engine.enabled_strategies.get(strategy_id)
        if strat is None:
            self._engine.event_bus.publish(
                make_log_event(
                    level="DEBUG",
                    message="stop_strategy: strategy not enabled",
                    extra={"strategy_id": strategy_id},
                )
            )
            return

        strat.on_stop()
        del self._engine.enabled_strategies[strategy_id]

        cfg = getattr(strat, "config", {}) or {}
        name = cfg.get("name", strategy_id)

        self._engine.event_bus.publish(
            make_strategy_status_event(
                strategy_id=strategy_id,
                enabled=False,
                name=name,
            )
        )

        self._engine.event_bus.publish(
            make_strategy_snapshot_event(self._engine._build_strategy_snapshot_data())
        )

        self._engine.event_bus.publish(
            make_log_event(
                level="INFO",
                message="Strategy stopped via control",
                extra={"strategy_id": strategy_id},
            )
        )

    def _cmd_update_params(self, cmd: Dict[str, Any]) -> None:
        strategy_id = cmd.get("strategy_id")
        if not strategy_id:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="update_params missing strategy_id",
                    extra={"command": cmd},
                )
            )
            return

        strat = self._engine.strategy_instances.get(strategy_id)
        if strat is None:
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="update_params: unknown strategy_id",
                    extra={"strategy_id": strategy_id},
                )
            )
            return

        params = cmd.get("params")
        if not isinstance(params, dict):
            self._engine.event_bus.publish(
                make_log_event(
                    level="WARN",
                    message="update_params: 'params' must be an object",
                    extra={"command": cmd},
                )
            )
            return

        strat.on_params_update(params)

        self._engine.event_bus.publish(
            make_log_event(
                level="INFO",
                message="Strategy params updated via control",
                extra={"strategy_id": strategy_id, "params": params},
            )
        )

    def _cmd_request_state(self, cmd: Dict[str, Any]) -> None:
        strategy_id = cmd.get("strategy_id")

        if strategy_id:
            strat = self._engine.strategy_instances.get(strategy_id)
            if strat is None:
                self._engine.event_bus.publish(
                    make_log_event(
                        level="WARN",
                        message="request_state: unknown strategy_id",
                        extra={"strategy_id": strategy_id},
                    )
                )
                return

            if strategy_id not in self._engine.enabled_strategies:
                self._engine.event_bus.publish(
                    make_log_event(
                        level="INFO",
                        message="request_state: strategy not enabled, no live state",
                        extra={"strategy_id": strategy_id},
                    )
                )
                return

            state = self._engine._simulator.get_strategy_state(strategy_id)
            strat_state_id = state["strategy_id"]
            strat_state = state["state"]

            for ev in make_state_update_events(
                strategy_id=strat_state_id,
                state=strat_state,
            ):
                self._engine.event_bus.publish(ev)

            self._engine.event_bus.publish(
                make_log_event(
                    level="INFO",
                    message="request_state: strategy state snapshot published",
                    extra={"strategy_id": strategy_id},
                )
            )
            return

        self._engine._publish_all_states()

        self._engine.event_bus.publish(
            make_strategy_snapshot_event(self._engine._build_strategy_snapshot_data())
        )

        self._engine.event_bus.publish(
            make_log_event(
                level="INFO",
                message="request_state: global state snapshot published",
                extra={
                    "enabled_strategies": list(self._engine.enabled_strategies.keys()),
                    "all_strategies": list(self._engine.strategy_instances.keys()),
                },
            )
        )
