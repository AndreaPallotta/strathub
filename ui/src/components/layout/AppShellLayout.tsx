import type { ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellMain,
  AppShellNavbar,
  AppShellSection,
  Burger,
  Group,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { EngineStatusBar } from '../status/EngineStatusBar';
import { EngineMetricsWidget } from '../status/EngineMetricsWidget';

type AppShellLayoutProps = {
  children: ReactNode;
};

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShellHeader>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={600}>StratHub Dashboard</Text>
          </Group>

          <Group gap="md">
            <EngineMetricsWidget />
            <EngineStatusBar />
          </Group>
        </Group>
      </AppShellHeader>

      <AppShellNavbar p="md">
        <AppShellSection>
          <Text size="sm" fw={500} mb="xs">
            Coming soon...
          </Text>
          <Text size="sm">Coming soon...</Text>
        </AppShellSection>
      </AppShellNavbar>

      <AppShellMain>{children}</AppShellMain>
    </AppShell>
  );
}
