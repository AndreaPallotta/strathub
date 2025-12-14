import { useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useEngineStore } from '../state/engineStore';
import type { EngineEvent } from '../types/engine';
import { ENGINE_WS_URL } from '../config';

export function useEngineStream() {
  useEffect(() => {
    const {
      setConnectionStatus,
      addLog,
      addPnlPoint,
      addStrategyPnlPoint,
      setStrategies,
      upsertStrategy,
      setPositions,
      upsertPosition,
      addTrade,
      upsertBacktest,
      setMetrics
    } = useEngineStore.getState();

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      setConnectionStatus('connecting');
      addLog(`[ui] Connecting to engine WebSocket: ${ENGINE_WS_URL}`);

      try {
        ws = new WebSocket(ENGINE_WS_URL);
      } catch (err) {
        const msg = '[ui] Failed to create WebSocket, will retry...';
        addLog(msg);
        notifications.show({
          title: 'Failed to connect',
          message: String(err ?? 'Unknown error creating WebSocket'),
          color: 'red',
        });
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        setConnectionStatus('connected');
        addLog('[ws] connected');

        try {
          const cmd = {
            type: 'StratHub.Command',
            command: 'request_state',
          };
          ws!.send(JSON.stringify(cmd));
          addLog('[ws] sent control: request_state');
        } catch (err) {
          console.error('[ws] failed to send request_state', err);
          addLog('[ws] failed to send request_state');
        }
      };

      ws.onmessage = (event) => {
        if (stopped) return;
        try {
          const parsed: EngineEvent = JSON.parse(event.data);

          switch (parsed.type) {
            case 'pnl_update':
              addPnlPoint({ t: parsed.timestamp, pnl: parsed.pnl });
              if (parsed.strategy_id) {
                addStrategyPnlPoint(parsed.strategy_id, {
                  t: parsed.timestamp,
                  pnl: parsed.pnl,
                });
              }
              break;
            case 'strategy_snapshot':
              setStrategies(parsed.strategies);
              break;
            case 'strategy_status':
              upsertStrategy({
                id: parsed.strategy_id,
                name: parsed.name ?? parsed.strategy_id,
                enabled: parsed.enabled,
              });
              break;
            case 'positions_snapshot':
              setPositions(parsed.positions);
              break;
            case 'position_update':
              upsertPosition(parsed.position);
              break;
            case 'trade':
              addTrade(parsed.trade);
              break;
            case 'backtest_status':
              upsertBacktest(parsed.backtest);
              break;
            case 'log':
              addLog(`[${parsed.level ?? 'info'}] ${parsed.message}`);
              break;
            case 'metrics':
              setMetrics(parsed.cpu, parsed.mem_gb ?? null, parsed.timestamp);
              break;
            default:
              addLog(`[ui] Unknown event type: ${(parsed as any).type}`);
          }
        } catch (err) {
          console.error('Failed to parse engine event', err);
          addLog('[ui] Failed to parse engine event');
        }
      };

      ws.onerror = () => {
        if (stopped) return;
        const msg = '[ui] WebSocket error';
        addLog(msg);
        notifications.show({
          title: 'WebSocket error',
          message: `Error on engine stream: ${ENGINE_WS_URL}`,
          color: 'red',
        });
      };

      ws.onclose = () => {
        if (stopped) return;
        setConnectionStatus('disconnected');
        const msg = '[ui] WebSocket closed, retrying in 2s...';
        addLog(msg);
        notifications.show({
          title: 'Disconnected from engine',
          message: 'Will retry in a couple of seconds.',
          color: 'yellow',
        });
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      if (reconnectTimer !== null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 2000);
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);
}
