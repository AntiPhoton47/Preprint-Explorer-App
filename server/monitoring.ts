type MonitoringEvent = {
  type: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  payload: Record<string, unknown>;
};

const monitoringProvider = process.env.MONITORING_PROVIDER ?? 'generic-webhook';
const monitoringWebhookUrl = process.env.MONITORING_WEBHOOK_URL;
const monitoringWebhookToken = process.env.MONITORING_WEBHOOK_TOKEN;

function buildMonitoringBody(event: MonitoringEvent) {
  if (monitoringProvider === 'slack') {
    return {
      text: `[${event.severity.toUpperCase()}] ${event.type}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${event.severity.toUpperCase()}: ${event.type}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Timestamp*\n${event.timestamp}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity*\n${event.severity}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${JSON.stringify(event.payload, null, 2)}\`\`\``,
          },
        },
      ],
    };
  }

  return event;
}

export async function emitMonitoringEvent(event: MonitoringEvent) {
  if (!monitoringWebhookUrl) {
    return;
  }

  try {
    await fetch(monitoringWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(monitoringWebhookToken ? { Authorization: `Bearer ${monitoringWebhookToken}` } : {}),
      },
      body: JSON.stringify(buildMonitoringBody(event)),
    });
  } catch (error) {
    console.error(JSON.stringify({
      type: 'monitoring_delivery_error',
      message: error instanceof Error ? error.message : 'Unknown monitoring delivery failure',
      monitoringWebhookUrl,
    }));
  }
}
