import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useEngineStore } from '../state/engineStore';
import { fetchEngineSnapshot } from '../api/engine';

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
      setMetrics
    } = useEngineStore.getState();

    let unlistenFn: (() => void) | null = null;
    let isSubscribed = true;

    async function initTauriStream() {
      try {
        setConnectionStatus('connected');
        addLog('[tauri] Connected to Rust Engine IPC');

        const snapshot = await fetchEngineSnapshot();
        if (snapshot) {
          if (snapshot.strategies) setStrategies(snapshot.strategies);
          if (snapshot.positions) setPositions(snapshot.positions);
        }

        const unlisten = await listen<any>('engine-event', (event) => {
          if (!isSubscribed) return;
          const parsed = event.payload;
          if (!parsed) return;

          switch (parsed.type) {
            case 'pnl_update':
              if (parsed.strategy_id) {
                // Route to per-strategy PnL series
                addStrategyPnlPoint(parsed.strategy_id, {
                  t: parsed.timestamp,
                  pnl: parsed.pnl,
                });
              } else {
                // Route exclusively to Global PnL series
                addPnlPoint({ t: parsed.timestamp, pnl: parsed.pnl });
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
            case 'position_update':
              if (parsed.position) {
                upsertPosition(parsed.position);
              }
              break;
            case 'trade':
              if (parsed.trade) {
                addTrade(parsed.trade);
              }
              break;
            case 'log':
              addLog(`[${parsed.level ?? 'info'}] ${parsed.message}`);
              break;
            case 'metrics':
              setMetrics(parsed.cpu, parsed.mem_gb ?? null, parsed.timestamp);
              break;
          }
        });

        unlistenFn = unlisten;
      } catch (err) {
        console.warn('Tauri IPC stream not available', err);
        setConnectionStatus('disconnected');
      }
    }

    initTauriStream();

    return () => {
      isSubscribed = false;
      if (unlistenFn) unlistenFn();
    };
  }, []);
}
