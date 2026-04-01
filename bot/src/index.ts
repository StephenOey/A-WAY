import { App } from '@slack/bolt';
import type { AppMentionEvent, GenericMessageEvent } from '@slack/bolt';
import type { Annotation } from '@a-way/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// ── Shared helpers ─────────────────────────────────────────────────

async function fetchAnnotations(query: string): Promise<Annotation[]> {
  const url = `${API_URL}/annotations?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json() as Promise<Annotation[]>;
}

function formatReply(annotations: Annotation[], query: string): string {
  const header =
    ':robot_face: *A-WAY — AI-generated response (stub mode)*\n' +
    `Query: _${query}_\n\n`;

  if (annotations.length === 0) {
    return header + 'No matching annotations found.';
  }

  const lines = annotations.map((a) =>
    `• *Frame:* <${a.frame_link}|Open in Figma>\n` +
    `  *Designer:* <@${a.designer_id}>\n` +
    `  *Note:* ${a.note}`
  );

  return header + lines.join('\n\n');
}

// ── app_mention handler ────────────────────────────────────────────

app.event('app_mention', async ({ event, say }) => {
  const mentionEvent = event as AppMentionEvent;
  // Strip the bot mention tag from the message text
  const query = mentionEvent.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  try {
    const annotations = await fetchAnnotations(query);
    await say({
      text: formatReply(annotations, query),
      thread_ts: mentionEvent.ts,
    });
  } catch (err) {
    console.error('app_mention error:', err);
    await say({
      text: ':warning: A-WAY could not fetch annotations. Please try again later.',
      thread_ts: mentionEvent.ts,
    });
  }
});

// ── Direct message (message.im) handler ───────────────────────────

app.message(async ({ message, say }) => {
  const dm = message as GenericMessageEvent;
  // Only handle DMs
  if (dm.channel_type !== 'im') return;
  const query = dm.text ?? '';
  if (!query.trim()) return;

  try {
    const annotations = await fetchAnnotations(query);
    await say({
      text: formatReply(annotations, query),
      thread_ts: dm.ts,
    });
  } catch (err) {
    console.error('DM handler error:', err);
    await say(':warning: A-WAY could not fetch annotations. Please try again later.');
  }
});

// ── Start ──────────────────────────────────────────────────────────

(async () => {
  const port = Number(process.env.PORT ?? 3000);
  await app.start(port);
  console.log(`A-WAY bot running on port ${port}`);
})();
