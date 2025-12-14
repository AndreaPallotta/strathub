# StratHub

## Disclaimer
> This project is provided "as-is" for learning / hobby purposes only. It is not intended for production or enterprise trading. Use at your own risk — I take no responsibility for any losses, outages, or other issues that may arise from running or adapting this code.

## What is it
- StratHub is a small Python-based framework for building and running trading strategies locally.
- The engine ingests market snapshots, routes them to strategy instances, and emits events (PnL, positions, trades, logs) that a React + TypeScript UI can consume.
- Example pieces:
  - engine entrypoint: [`run.py`](run.py)
  - engine class: [`Engine`](core/engine_loop.py)
  - base strategy API: [`StrategyBase`](strategies/base.py) and [`StrategyAction`](strategies/base.py)
  - strategy discovery: [`discover_strategies`](core/strategy_loader.py)
  - example strategy: [`ArbExampleStrategy`](strategies/arb_example.py)
  - control/commands: [`ControlCommandHandler`](core/control/command_handler.py)
  - event types / factory functions: [`EventType`](core/models/events.py)
  - per-strategy config loader: [`load_strategy_config`](core/config.py)

## Tech stack (quick)
- Backend / Engine
  - Python 3 (environment defined in [env.yaml](env.yaml))
  - Core engine class: [`Engine`](core/engine_loop.py)
  - Strategy base & example: [`StrategyBase`](strategies/base.py), [`ArbExampleStrategy`](strategies/arb_example.py)
  - Strategy discovery: [`discover_strategies`](core/strategy_loader.py)
  - Control & WS server (control queue + websocket): see [`ControlCommandHandler`](core/control/command_handler.py) and [`run.py`](run.py)
- Frontend / UI
  - React + TypeScript + Vite (see [ui/README.md](ui/README.md))
  - UI state / stream:
    - WebSocket stream hook: [`useEngineStream`](ui/src/hooks/useEngineStream.ts)
    - Global store: [`useEngineStore`](ui/src/state/engineStore.ts)
    - API helpers: [`toggleStrategy`](ui/src/api/engine.ts), [`runBacktest`](ui/src/api/engine.ts)
  - UI package manifest: [ui/package.json](ui/package.json)

## How to use (quick start)
1. Copy the example config and edit secrets & endpoints
   - cp config/strathub.yaml.example config/strathub.yaml
   - Edit [config/strathub.yaml](config/strathub.yaml) to provide API keys and any other settings (odds API keys, Kalshi details, simulation settings, etc).

2. Create and activate the Python environment
   - The environment spec is in [env.yaml](env.yaml). Create it with conda:
```bash
conda env create -f env.yaml
conda activate strat_hub
```

3. Start the backend engine
   - From the project root:
```bash
python run.py
```
   - `run.py` will load the config, discover strategies via [`discover_strategies`](core/strategy_loader.py), and start the engine and WebSocket server as configured.

4. Run the UI (development)
   - Install UI deps and start the Vite dev server:
```bash
cd ui
npm install
npm run dev
```
   - The UI connects to the engine WebSocket (see [`useEngineStream`](ui/src/hooks/useEngineStream.ts)) and exposes controls to toggle strategies, run backtests, and view logs / metrics.

5. Build the UI for production
```bash
cd ui
npm run build
```

## Adding / developing strategies
- Create a new Python module under `strategies/` that defines a subclass of [`StrategyBase`](strategies/base.py). Ensure your class sets a unique `strategy_id` attribute.
- Strategy configs live in `config/strategies/<strategy_id>.yaml` and are loaded by [`load_strategy_config`](core/config.py).
- New strategy modules are auto-discovered by [`discover_strategies`](core/strategy_loader.py) when the engine starts.

## Useful entrypoints & files
- Project configuration: [config/strathub.yaml.example](config/strathub.yaml.example) (copy to `config/strathub.yaml`)
- Conda environment spec: [env.yaml](env.yaml)
- Engine run script: [run.py](run.py)
- Engine core: [`Engine`](core/engine_loop.py)
- Strategy base & actions: [`StrategyBase`](strategies/base.py), [`StrategyAction`](strategies/base.py)
- Strategy discovery: [`discover_strategies`](core/strategy_loader.py)
- Control handler: [`ControlCommandHandler`](core/control/command_handler.py)
- Frontend README: [ui/README.md](ui/README.md)
- Frontend manifest: [ui/package.json](ui/package.json)
- Frontend stream hook: [`useEngineStream`](ui/src/hooks/useEngineStream.ts)
- Frontend store: [`useEngineStore`](ui/src/state/engineStore.ts)
- Frontend API helpers: [`toggleStrategy`](ui/src/api/engine.ts), [`runBacktest`](ui/src/api/engine.ts)

## Short notes / tips
- When you change strategy code or add a new strategy file, restart the engine to pick it up.
- Use the UI to send control commands (the UI sends a `request_state` control command on connect; see [`useEngineStream`](ui/src/hooks/useEngineStream.ts)).
- Logs, snapshots and other transports are configurable in [config/strathub.yaml](config/strathub.yaml).
