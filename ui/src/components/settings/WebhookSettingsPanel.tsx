import {
  Card,
  Text,
  TextInput,
  Button,
  Group,
  Stack,
  Switch,
  Badge,
  Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandDiscord, IconBrandSlack, IconSend } from '@tabler/icons-react';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function WebhookSettingsPanel() {
  const [slackUrl, setSlackUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [notifyFills, setNotifyFills] = useState(true);
  const [notifyRisk, setNotifyRisk] = useState(true);
  const [notifyBacktest, setNotifyBacktest] = useState(true);

  const [testingSlack, setTestingSlack] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);

  const handleTestSlack = async () => {
    if (!slackUrl) return;
    setTestingSlack(true);
    try {
      await invoke('send_test_webhook', { url: slackUrl, platform: 'Slack' });
      notifications.show({
        title: 'Slack Webhook Test Sent',
        message: 'Successfully dispatched test notification payload to Slack',
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Slack Test Failed',
        message: String(err),
        color: 'red',
      });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleTestDiscord = async () => {
    if (!discordUrl) return;
    setTestingDiscord(true);
    try {
      await invoke('send_test_webhook', { url: discordUrl, platform: 'Discord' });
      notifications.show({
        title: 'Discord Webhook Test Sent',
        message: 'Successfully dispatched test notification payload to Discord',
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Discord Test Failed',
        message: String(err),
        color: 'red',
      });
    } finally {
      setTestingDiscord(false);
    }
  };

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600} size="md">
          Slack & Discord Webhook Alert Integration
        </Text>
        <Badge color="violet" variant="filled">
          Real-Time Push Alerts
        </Badge>
      </Group>

      <Stack gap="md">
        {/* Slack Section */}
        <Paper p="xs" radius="sm" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconBrandSlack size={20} color="#e01e5a" />
              <Text size="xs" fw={600}>
                Slack Incoming Webhook URL
              </Text>
            </Group>
            <Button
              size="xs"
              variant="light"
              color="pink"
              leftSection={<IconSend size={14} />}
              onClick={handleTestSlack}
              disabled={!slackUrl}
              loading={testingSlack}
            >
              Test Slack Alert
            </Button>
          </Group>
          <TextInput
            size="xs"
            placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.currentTarget.value)}
          />
        </Paper>

        {/* Discord Section */}
        <Paper p="xs" radius="sm" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconBrandDiscord size={20} color="#5865f2" />
              <Text size="xs" fw={600}>
                Discord Webhook URL
              </Text>
            </Group>
            <Button
              size="xs"
              variant="light"
              color="indigo"
              leftSection={<IconSend size={14} />}
              onClick={handleTestDiscord}
              disabled={!discordUrl}
              loading={testingDiscord}
            >
              Test Discord Alert
            </Button>
          </Group>
          <TextInput
            size="xs"
            placeholder="https://discord.com/api/webhooks/123456/abcdef"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.currentTarget.value)}
          />
        </Paper>

        {/* Notification Trigger Options */}
        <Paper p="xs" radius="sm" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
          <Text size="xs" fw={600} mb="xs" c="dimmed">
            Notification Trigger Preferences
          </Text>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs">Notify on Order Fills & Trades</Text>
              <Switch size="xs" checked={notifyFills} onChange={(e) => setNotifyFills(e.currentTarget.checked)} />
            </Group>
            <Group justify="space-between">
              <Text size="xs">Notify on Risk Limits / Circuit Breakers</Text>
              <Switch size="xs" checked={notifyRisk} onChange={(e) => setNotifyRisk(e.currentTarget.checked)} />
            </Group>
            <Group justify="space-between">
              <Text size="xs">Notify on Backtest Completion</Text>
              <Switch size="xs" checked={notifyBacktest} onChange={(e) => setNotifyBacktest(e.currentTarget.checked)} />
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Card>
  );
}
