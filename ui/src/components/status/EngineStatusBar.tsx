import { Badge } from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';

export function EngineStatusBar() {
  const status = useEngineStore((s) => s.connectionStatus);

  const color =
    status === 'connected' ? 'green' : status === 'connecting' ? 'yellow' : 'red';

  return (
    <Badge size="sm" radius="xl" color={color} variant="filled">
      {status}
    </Badge>
  );
}
