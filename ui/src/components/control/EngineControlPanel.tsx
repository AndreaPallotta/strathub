import { Card, Text, Button, Group } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { sendEngineCommand } from '../../api/engine';
import { useEngineStore } from '../../state/engineStore';

export function EngineControlPanel() {
  const [busy, setBusy] = useState(false);
  const resetUi = useEngineStore((s) => s.reset);

  const runCommand = async (cmd: 'pause_all' | 'resume_all' | 'reload_config') => {
    setBusy(true);
    try {
        await sendEngineCommand(cmd);
        const { addLog } = useEngineStore.getState();
        addLog(`[ui] Sent engine command: ${cmd}`);
        notifications.show({
        title: 'Engine command sent',
        message: cmd,
        color: 'green',
        });
    } catch (err) {
        console.error('Failed to send engine command', err);
        const { addLog } = useEngineStore.getState();
        addLog(`[ui] Failed to send engine command: ${cmd}`);
        notifications.show({
        title: 'Engine command failed',
        message: String(err ?? 'Unknown error'),
        color: 'red',
        });
    } finally {
        setBusy(false);
    }
  };

  const handleResetUi = () => {
    resetUi();
    const { addLog } = useEngineStore.getState();
    addLog('[ui] Cleared UI state');
  };

  return (
    <Card withBorder radius="md" h="100%">
      <Text fw={500} mb="xs">
        Engine control
      </Text>
      <Group gap="xs" mb="xs">
        <Button
          size="xs"
          variant="light"
          color="yellow"
          onClick={() => runCommand('pause_all')}
          disabled={busy}
        >
          Pause all
        </Button>
        <Button
          size="xs"
          variant="light"
          color="green"
          onClick={() => runCommand('resume_all')}
          disabled={busy}
        >
          Resume all
        </Button>
        <Button
          size="xs"
          variant="light"
          color="blue"
          onClick={() => runCommand('reload_config')}
          disabled={busy}
        >
          Reload config
        </Button>
      </Group>

      <Group gap="xs">
        <Button
          size="xs"
          variant="outline"
          color="red"
          onClick={handleResetUi}
        >
          Clear UI state
        </Button>
      </Group>
    </Card>
  );
}
