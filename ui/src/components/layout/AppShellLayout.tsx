import { useEffect, useState, type ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellMain,
  AppShellNavbar,
  AppShellSection,
  Burger,
  Group,
  Text,
  NavLink,
  Badge,
  Stack,
  Divider,
  ActionIcon,
  Tooltip,
  Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconCpu,
  IconBriefcase,
  IconRss,
  IconPlayerPlay,
  IconTerminal2,
  IconRefresh,
  IconActivity,
  IconFlame,
  IconBellRinging,
} from '@tabler/icons-react';
import { EngineStatusBar } from '../status/EngineStatusBar';
import { EngineMetricsWidget } from '../status/EngineMetricsWidget';
import { useEngineStore } from '../../state/engineStore';
import { fetchAppVersion, type AppVersionInfo } from '../../api/engine';

export type NavTab = 'dashboard' | 'strategies' | 'positions' | 'feeds' | 'backtest' | 'optimizer' | 'webhooks' | 'logs';

type AppShellLayoutProps = {
  children: ReactNode;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
};

export function AppShellLayout({ children, activeTab, onTabChange }: AppShellLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const [appVersion, setAppVersion] = useState<AppVersionInfo>({
    version: '2.0.0-alpha.1',
    engine: 'Rust Core',
    edition: '2021',
  });

  const strategies = useEngineStore((s) => s.strategies);
  const positions = useEngineStore((s) => s.positions);

  useEffect(() => {
    fetchAppVersion().then((info) => {
      if (info) setAppVersion(info);
    });
  }, []);

  const activeStrategiesCount = strategies.filter((s) => s.enabled).length;

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShellHeader style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconActivity size={24} color="#38bdf8" />
            <Text fw={700} size="lg" style={{ letterSpacing: '-0.5px' }}>
              Strat<Text component="span" c="sky" fw={700}>Hub</Text>
            </Text>
            <Tooltip label={`Engine: ${appVersion.engine} (${appVersion.edition})`}>
              <Badge size="xs" variant="filled" color="sky">
                v{appVersion.version}
              </Badge>
            </Tooltip>
          </Group>

          <Group gap="md">
            <EngineMetricsWidget />
            <EngineStatusBar />
          </Group>
        </Group>
      </AppShellHeader>

      <AppShellNavbar p="xs" style={{ borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <AppShellSection grow>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="xs" mb="xs">
            Navigation
          </Text>

          <Stack gap={4}>
            <NavLink
              label="Overview Dashboard"
              leftSection={<IconDashboard size={18} stroke={1.5} />}
              active={activeTab === 'dashboard'}
              onClick={() => onTabChange('dashboard')}
              variant="light"
              color="sky"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="Strategies & Tweaker"
              leftSection={<IconCpu size={18} stroke={1.5} />}
              active={activeTab === 'strategies'}
              onClick={() => onTabChange('strategies')}
              rightSection={
                <Badge size="xs" variant="dot" color={activeStrategiesCount > 0 ? 'green' : 'gray'}>
                  {activeStrategiesCount} / {strategies.length}
                </Badge>
              }
              variant="light"
              color="sky"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="Positions & PnL"
              leftSection={<IconBriefcase size={18} stroke={1.5} />}
              active={activeTab === 'positions'}
              onClick={() => onTabChange('positions')}
              rightSection={
                positions.length > 0 ? (
                  <Badge size="xs" color="blue" variant="filled">
                    {positions.length}
                  </Badge>
                ) : null
              }
              variant="light"
              color="sky"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="Data Feeds"
              leftSection={<IconRss size={18} stroke={1.5} />}
              active={activeTab === 'feeds'}
              onClick={() => onTabChange('feeds')}
              rightSection={
                <Badge size="xs" color="teal" variant="light">
                  Synthetic
                </Badge>
              }
              variant="light"
              color="sky"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="Backtest Engine"
              leftSection={<IconPlayerPlay size={18} stroke={1.5} />}
              active={activeTab === 'backtest'}
              onClick={() => onTabChange('backtest')}
              variant="light"
              color="sky"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="Parameter Optimizer"
              leftSection={<IconFlame size={18} stroke={1.5} color="#f59e0b" />}
              active={activeTab === 'optimizer'}
              onClick={() => onTabChange('optimizer')}
              variant="light"
              color="amber"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="Webhook Alerts"
              leftSection={<IconBellRinging size={18} stroke={1.5} color="#a855f7" />}
              active={activeTab === 'webhooks'}
              onClick={() => onTabChange('webhooks')}
              variant="light"
              color="violet"
              style={{ borderRadius: 6 }}
            />
            <NavLink
              label="System Logs"
              leftSection={<IconTerminal2 size={18} stroke={1.5} />}
              active={activeTab === 'logs'}
              onClick={() => onTabChange('logs')}
              variant="light"
              color="sky"
              style={{ borderRadius: 6 }}
            />
          </Stack>
        </AppShellSection>

        <Divider my="xs" label="Engine Mode" labelPosition="center" />

        <AppShellSection>
          <Paper p="xs" radius="md" withBorder style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <Text size="xs" fw={600} c="dimmed">
              Active Data Feed:
            </Text>
            <Group justify="space-between" mt={4}>
              <Badge size="sm" color="teal" variant="filled">
                Synthetic Mock
              </Badge>
              <Tooltip label="0 API setup required">
                <ActionIcon size="xs" variant="subtle" color="gray">
                  <IconRefresh size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Paper>
        </AppShellSection>
      </AppShellNavbar>

      <AppShellMain>{children}</AppShellMain>
    </AppShell>
  );
}
