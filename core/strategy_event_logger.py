from core.models.events import make_log_event


class StrategyEventLogger:
    def __init__(self, strategy_id: str, event_bus):
        self.strategy_id = strategy_id
        self.event_bus = event_bus

    def _emit(self, level: str, message: str, extra=None):
        payload = extra or {}
        payload["strategy_id"] = self.strategy_id
        self.event_bus.publish(make_log_event(level, message, payload))

    def debug(self, message: str, extra=None):
        self._emit("DEBUG", message, extra)

    def info(self, message: str, extra=None):
        self._emit("INFO", message, extra)

    def warning(self, message: str, extra=None):
        self._emit("WARNING", message, extra)

    def error(self, message: str, extra=None):
        self._emit("ERROR", message, extra)

    def exception(self, message: str, extra=None):
        self._emit("ERROR", message, extra)
        self._emit("ERROR", message, extra)
