import {
  Card,
  Text,
  Stack,
  Group,
  Slider,
  NumberInput,
  Switch,
  Badge,
  Tooltip,
  Paper,
  Button,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments, IconDeviceFloppy } from '@tabler/icons-react';
import { useState } from 'react';
import { updateStrategyParams } from '../../api/engine';
import { useEngineStore } from '../../state/engineStore';

export interface StrategyParamMeta {
  key: string;
  label: string;
  type: 'float' | 'integer' | 'boolean';
  default: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

const ARB_EXAMPLE_SCHEMA: StrategyParamMeta[] = [
  {
    key: 'min_spread',
    label: 'Min Arbitrage Edge ($)',
    type: 'float',
    default: 0.015,
    min: 0.001,
    max: 0.15,
    step: 0.005,
    description: 'Minimum price discrepancy required to trigger an arbitrage execution signal',
  },
  {
    key: 'max_position_size',
    label: 'Max Contract Size',
    type: 'integer',
    default: 15,
    min: 1,
    max: 100,
    step: 1,
    description: 'Maximum number of contracts allowed per leg',
  },
  {
    key: 'cooldown_seconds',
    label: 'Execution Cooldown (s)',
    type: 'float',
    default: 1.5,
    min: 0.1,
    max: 10.0,
    step: 0.5,
    description: 'Delay between consecutive order execution signals',
  },
];

type StrategyParamTweakerProps = {
  strategyId: string;
};

export function StrategyParamTweaker({ strategyId }: StrategyParamTweakerProps) {
  const addLog = useEngineStore((s) => s.addLog);
  const [params, setParams] = useState<Record<string, number>>({
    min_spread: 0.015,
    max_position_size: 15,
    cooldown_seconds: 1.5,
  });

  const [saving, setSaving] = useState(false);

  const handleParamChange = (key: string, val: number) => {
    const next = { ...params, [key]: val };
    setParams(next);
  };

  const handleSaveAndApply = async () => {
    setSaving(true);
    try {
      await updateStrategyParams(strategyId, params);
      addLog(`[INFO] Live strategy parameters updated for ${strategyId}: ${JSON.stringify(params)}`);

      notifications.show({
        title: 'Parameters Updated',
        message: `Successfully hot-reloaded parameters for ${strategyId}`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Failed to update parameters',
        message: String(err),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" p="md" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconAdjustments size={20} color="#38bdf8" />
          <Text fw={600} size="sm">
            Live Parameter Tweaker
          </Text>
          <Badge size="xs" color="sky" variant="light">
            PyO3 Hot-Reload
          </Badge>
        </Group>
        <Button
          size="xs"
          color="sky"
          leftSection={<IconDeviceFloppy size={14} />}
          onClick={handleSaveAndApply}
          loading={saving}
        >
          Apply Parameters
        </Button>
      </Group>

      <Stack gap="md">
        {ARB_EXAMPLE_SCHEMA.map((meta) => {
          const currentVal = params[meta.key] ?? meta.default;
          return (
            <Paper key={meta.key} p="xs" radius="sm" withBorder style={{ background: 'rgba(0,0,0,0.15)' }}>
              <Group justify="space-between" mb={4}>
                <Tooltip label={meta.description} multiline w={220}>
                  <Text size="xs" fw={500}>
                    {meta.label}
                  </Text>
                </Tooltip>
                <Text size="xs" fw={700} c="sky">
                  {meta.type === 'float' ? currentVal.toFixed(3) : currentVal}
                </Text>
              </Group>

              {meta.type === 'boolean' ? (
                <Switch
                  size="xs"
                  checked={currentVal === 1}
                  onChange={(e) => handleParamChange(meta.key, e.currentTarget.checked ? 1 : 0)}
                />
              ) : (
                <Group gap="md">
                  <Slider
                    size="xs"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={currentVal}
                    onChange={(v) => handleParamChange(meta.key, v)}
                    style={{ flex: 1 }}
                    color="sky"
                  />
                  <NumberInput
                    size="xs"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={currentVal}
                    onChange={(v) => handleParamChange(meta.key, Number(v) || meta.min)}
                    w={80}
                  />
                </Group>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Card>
  );
}
