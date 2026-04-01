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
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json() as Promise<Annotation[]>;
}

function formatReply(annotations: Annotation[], query: string): string {
  const header =
    ':robot_face: *A-WAY — AI-generated response*\n' +
    `> Query: _${query}_\n\n`;

  if (annotations.length === 0) {
    return (
      header +
      "No matching annotations found. The designer may not have left notes on this yet, or try rephrasing your question."
    );
  }

  const lines = annotations.slice(0, 5).map((a, i) => {
    const tag = a.designer_id.startsWith('U') ? `<@${a.designer_id}>` : `*${a.designer_id}*`;
    return (
      `${i + 1}. *Frame:* <${a.frame_link}|Open in Figma>  |  Designer: ${tag}\n` +
      `   > ${a.note}`
    );
  });

  const footer =
    annotations.length > 5
      ? `\n_…and ${annotations.length - 5} more result(s). Narrow your query for better results._`
      : '';

  return header + lines.join('\n\n') + footer;
}

// ── app_mention handler ────────────────────────────────────────────

app.event('app_mention', async ({ event, say }) => {
  const mentionEvent = event as AppMentionEvent;
  const query = mentionEvent.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  if (!query) {
    await say({
      text: ':wave: Hi! Ask me anything about a design decision, e.g. _@away what is the nav bar height?_',
      thread_ts: mentionEvent.ts,
    });
    return;
  }

  try {
    const annotations = await fetchAnnotations(query);
    await say({ text: formatReply(annotations, query), thread_ts: mentionEvent.ts });
  } catch (err) {
    console.error('app_mention error:', err);
    await say({
      text: ':warning: *A-WAY* could not reach the annotation service. Please try again later.',
      thread_ts: mentionEvent.ts,
    });
  }
});

// ── Direct message handler ─────────────────────────────────────────

app.message(async ({ message, say }) => {
  const dm = message as GenericMessageEvent;

  // Only handle plain DMs (no bot messages, no thread replies to keep things clean)
  if (dm.channel_type !== 'im') return;
  if ('subtype' in dm && dm.subtype) return;

  const query = dm.text?.trim() ?? '';
  if (!query) return;

  try {
    const annotations = await fetchAnnotations(query);
    await say({ text: formatReply(annotations, query), thread_ts: dm.ts });
  } catch (err) {
    console.error('DM handler error:', err);
    await say({
      text: ':warning: *A-WAY* could not reach the annotation service. Please try again later.',
    });
  }
});

// ── Start ──────────────────────────────────────────────────────────

(async () => {
  const port = Number(process.env.PORT ?? 3000);
  await app.start(port);
  console.log(`A-WAY bot running on port ${port}`);
})();
