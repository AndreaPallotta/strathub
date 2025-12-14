import { Card, Text, ScrollArea, Group, Switch, Slider } from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';
import { useEffect, useRef, useState } from 'react';
import { loadPrefs, savePrefs } from '../../lib/prefs';

export function LogsPanel() {
  const logs = useEngineStore((s) => s.logs);
  const prefs = loadPrefs();
  const [autoScroll, setAutoScroll] = useState(
    prefs.autoScrollLogs ?? true
  );

  const [height, setHeight] = useState<number>(
    typeof prefs.logsHeight === 'number' ? prefs.logsHeight : 260,
  );

  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoScroll) return;
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [logs, autoScroll]);

  const handleAutoScrollToggle = (checked: boolean) => {
    setAutoScroll(checked);
    savePrefs({ autoScrollLogs: checked });
  };

  const handleHeightChange = (value: number) => {
    setHeight(value);
    savePrefs({ logsHeight: value });
  };

  return (
    <Card withBorder radius="md" h={height}>
      <Group justify="space-between" mb="xs">
        <Text fw={500}>Logs</Text>
        <Group gap="sm">
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              Height
            </Text>
            <Slider
              size="xs"
              min={160}
              max={480}
              step={20}
              value={height}
              onChange={handleHeightChange}
              w={120}
            />
          </Group>
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              Autoscroll
            </Text>
            <Switch
              size="xs"
              checked={autoScroll}
              onChange={(e) => handleAutoScrollToggle(e.currentTarget.checked)}
            />
          </Group>
        </Group>
      </Group>

      <ScrollArea
        h={height - 50}
        viewportRef={viewportRef}
        scrollbarSize={6}
        type="always"
      >
        {logs.length === 0 ? (
          <Text size="xs" c="dimmed">
            No logs yet.
          </Text>
        ) : (
          logs.map((line, idx) => (
            <Text key={idx} size="xs" c="dimmed">
              {line}
            </Text>
          ))
        )}
      </ScrollArea>
    </Card>
  );
}
