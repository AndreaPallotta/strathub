import { Card, Text, ScrollArea, Group, Switch, Slider, SegmentedControl, ActionIcon, Tooltip } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { useEngineStore } from '../../state/engineStore';
import { useEffect, useRef, useState, useMemo } from 'react';
import { loadPrefs, savePrefs } from '../../lib/prefs';

type LogFilter = 'all' | 'info' | 'warn' | 'error' | 'tauri';

function getLogColor(line: string): string {
  if (line.includes('[tauri]')) return 'dimmed';
  if (line.includes('[ERROR]') || line.includes('[error]')) return 'red';
  if (line.includes('[WARN]') || line.includes('[warning]')) return 'orange';
  if (line.includes('[SUCCESS]')) return 'green';
  if (line.includes('[CRITICAL]')) return 'violet';
  if (line.includes('[INFO]') || line.includes('[info]')) return 'white';
  if (line.includes('[ws]') || line.includes('[ui]')) return 'blue';
  return 'dimmed';
}

export function LogsPanel() {
  const logs = useEngineStore((s) => s.logs);
  const prefs = loadPrefs();
  const [autoScroll, setAutoScroll] = useState(
    prefs.autoScrollLogs ?? true
  );

  const [height, setHeight] = useState<number>(
    typeof prefs.logsHeight === 'number' ? prefs.logsHeight : 280,
  );
  const [filter, setFilter] = useState<LogFilter>('all');
  const [copied, setCopied] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      if (filter === 'tauri') return line.includes('[tauri]');
      if (filter === 'error') return line.includes('[ERROR]') || line.includes('[error]');
      if (filter === 'warn') return line.includes('[WARN]') || line.includes('[warning]');
      if (filter === 'info') return line.includes('[INFO]') || line.includes('[info]') || line.includes('[CRITICAL]');
      return true;
    });
  }, [logs, filter]);

  useEffect(() => {
    if (!autoScroll) return;
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [filteredLogs, autoScroll]);

  const handleAutoScrollToggle = (checked: boolean) => {
    setAutoScroll(checked);
    savePrefs({ autoScrollLogs: checked });
  };

  const handleHeightChange = (value: number) => {
    setHeight(value);
    savePrefs({ logsHeight: value });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card withBorder radius="md" h={height}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Text fw={600}>System Logs</Text>
          <SegmentedControl
            size="xs"
            value={filter}
            onChange={(v) => setFilter(v as LogFilter)}
            data={[
              { label: 'All', value: 'all' },
              { label: 'Info', value: 'info' },
              { label: 'Warn', value: 'warn' },
              { label: 'Error', value: 'error' },
              { label: 'Tauri', value: 'tauri' },
            ]}
          />
        </Group>

        <Group gap="sm">
          <Tooltip label="Copy all logs">
            <ActionIcon size="sm" variant="light" onClick={handleCopy} color={copied ? 'green' : 'gray'}>
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              Height
            </Text>
            <Slider
              size="xs"
              min={180}
              max={500}
              step={20}
              value={height}
              onChange={handleHeightChange}
              w={100}
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
        h={height - 60}
        viewportRef={viewportRef}
        scrollbarSize={6}
        type="always"
        style={{
          fontFamily: 'monospace',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 6,
          padding: '8px 12px',
        }}
      >
        {filteredLogs.length === 0 ? (
          <Text size="xs" c="dimmed">
            No matching log entries.
          </Text>
        ) : (
          filteredLogs.map((line, idx) => {
            const color = getLogColor(line);
            return (
              <Text key={idx} size="xs" c={color} style={{ lineHeight: 1.5 }}>
                {line}
              </Text>
            );
          })
        )}
      </ScrollArea>
    </Card>
  );
}
