import { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Textarea,
  Group,
  Button,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEngineStore } from '../../state/engineStore';
import { updateStrategyConfig } from '../../api/engine';

export function StrategyConfigPanel() {
  const selectedStrategyId = useEngineStore((s) => s.selectedStrategyId);
  const strategies = useEngineStore((s) => s.strategies);

  const [rawConfig, setRawConfig] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const currentStrategy = strategies.find(
    (s) => s.id === selectedStrategyId
  );

  useEffect(() => {
    setRawConfig('');
  }, [selectedStrategyId]);

  const handleApply = async () => {
    if (!selectedStrategyId) {
      notifications.show({
        title: 'No strategy selected',
        message: 'Select a strategy from the list first.',
        color: 'red',
      });
      return;
    }

    let parsed: unknown;
    try {
      parsed = rawConfig.trim() ? JSON.parse(rawConfig) : {};
    } catch (err) {
      notifications.show({
        title: 'Invalid JSON',
        message: 'Fix the JSON before applying.',
        color: 'red',
      });
      return;
    }

    setBusy(true);
    try {
      await updateStrategyConfig(selectedStrategyId, parsed);
      notifications.show({
        title: 'Config sent',
        message: `Updated config for ${selectedStrategyId}`,
        color: 'green',
      });
    } catch (err) {
      console.error('Failed to update strategy config', err);
      notifications.show({
        title: 'Failed to update config',
        message: 'Check engine logs / REST endpoint.',
        color: 'red',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder radius="md" h="100%">
      <Group justify="space-between" mb="xs">
        <Text fw={500}>Strategy parameters</Text>
        <Badge size="sm" variant="light">
          {selectedStrategyId ?? 'none selected'}
        </Badge>
      </Group>

      {!selectedStrategyId ? (
        <Text size="xs" c="dimmed">
          Select a strategy from the list to edit its parameters.
        </Text>
      ) : (
        <>
          <Text size="xs" c="dimmed" mb="xs">
            Edit JSON config for{' '}
            <strong>{currentStrategy?.name ?? selectedStrategyId}</strong>.
            This is sent as <code>{`{ config: ... }`}</code> to the engine REST API.
          </Text>

          <Textarea
            minRows={8}
            autosize
            placeholder='e.g. { "threshold": 2.0, "lookback": 60 }'
            value={rawConfig}
            onChange={(e) => setRawConfig(e.currentTarget.value)}
            mb="xs"
          />

          <Group justify="flex-end">
            <Button
              size="xs"
              variant="light"
              onClick={handleApply}
              disabled={busy}
            >
              Apply to engine
            </Button>
          </Group>
        </>
      )}
    </Card>
  );
}
