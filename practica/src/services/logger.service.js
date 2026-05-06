/**
 * Envía un mensaje a Slack con un Incoming Webhook.
 */
export const sendSlackError = async ({ method, path, statusCode, message, stack }) => {
  if (process.env.NODE_ENV === 'test') return;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    text: `*Error ${statusCode}* en \`${method} ${path}\``,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error ${statusCode}* — \`${method} ${path}\`\n*Mensaje:* ${message}\n*Timestamp:* ${new Date().toISOString()}`,
        },
      },
      ...(stack ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `\`\`\`${stack.slice(0, 500)}\`\`\`` },
      }] : []),
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[Slack] Failed to send notification:', err.message);
  }
};