import { App } from '@slack/bolt';
import type { AppMentionEvent, GenericMessageEvent } from '@slack/bolt';
import type { Annotation } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// ── Query parsing ──────────────────────────────────────────────────
// Supports optional prefixes in the query:
//   designer:<figma_user_id>   — filter by designer
//   frame:<figma_frame_id>     — filter by frame_id
// Example: "designer:U123 frame:456 nav bar height"
interface ParsedQuery {
  query: string;
  designerId?: string;
  frameId?: string;
}

function parseQuery(raw: string): ParsedQuery {
  let text = raw.trim();
  let designerId: string | undefined;
  let frameId: string | undefined;

  const designerMatch = text.match(/\bdesigner:(\S+)/i);
  if (designerMatch) {
    designerId = designerMatch[1];
    text = text.replace(designerMatch[0], '').trim();
  }

  const frameMatch = text.match(/\bframe:(\S+)/i);
  if (frameMatch) {
    frameId = frameMatch[1];
    text = text.replace(frameMatch[0], '').trim();
  }

  return { query: text, designerId, frameId };
}

// ── API fetch ──────────────────────────────────────────────────────
async function fetchAnnotations(parsed: ParsedQuery): Promise<Annotation[]> {
  const params = new URLSearchParams();
  if (parsed.query)      params.set('query',       parsed.query);
  if (parsed.designerId) params.set('designer_id', parsed.designerId);
  if (parsed.frameId)    params.set('frame_id',    parsed.frameId);

  const url = `${API_URL}/annotations?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json() as Promise<Annotation[]>;
}

// ── Response formatter ─────────────────────────────────────────────
function formatReply(annotations: Annotation[], parsed: ParsedQuery): string {
  const filters: string[] = [];
  if (parsed.query)      filters.push(`_"${parsed.query}"_`);
  if (parsed.designerId) filters.push(`designer: \`${parsed.designerId}\``);
  if (parsed.frameId)    filters.push(`frame: \`${parsed.frameId}\``);

  const header =
    ':mag: *A-WAY search*\n' +
    (filters.length > 0 ? `> ${filters.join('  ·  ')}\n\n` : '\n');

  if (annotations.length === 0) {
    return header + 'No matching annotations found. Try rephrasing your query or check the filters.';
  }

  const shown = annotations.slice(0, 8);
  const lines = shown.map((a, i) => {
    const designer = a.designer_id.startsWith('U') ? `<@${a.designer_id}>` : `*${a.designer_id}*`;
    const tags = (a.tags ?? []).length > 0
      ? `  \`${a.tags.join('\`  \`')}\``
      : '';
    return (
      `${i + 1}. <${a.frame_link}|Open in Figma>  ·  ${designer}${tags}\n` +
      `   > ${a.note}`
    );
  });

  const footer = annotations.length > 8
    ? `\n_…and ${annotations.length - 8} more result(s). Narrow your query for better results._`
    : '';

  return header + lines.join('\n\n') + footer;
}

// ── Shared handler ─────────────────────────────────────────────────
async function handleQuery(rawText: string, say: (msg: { text: string; thread_ts?: string }) => Promise<unknown>, threadTs?: string) {
  const parsed = parseQuery(rawText);

  if (!parsed.query && !parsed.designerId && !parsed.frameId) {
    await say({
      text: ':wave: Hi! Ask me anything about a design decision.\n' +
            'Examples:\n' +
            '• `/a-way nav bar height`\n' +
            '• `/a-way designer:U123 spacing`\n' +
            '• `/a-way frame:abc123 colors`',
      thread_ts: threadTs,
    });
    return;
  }

  try {
    const annotations = await fetchAnnotations(parsed);
    await say({ text: formatReply(annotations, parsed), thread_ts: threadTs });
  } catch (err) {
    console.error('query error:', err);
    await say({
      text: ':warning: *A-WAY* could not reach the annotation service. Please try again later.',
      thread_ts: threadTs,
    });
  }
}

// ── app_mention handler ────────────────────────────────────────────
app.event('app_mention', async ({ event, say }) => {
  const e = event as AppMentionEvent;
  const rawText = e.text.replace(/<@[A-Z0-9]+>/g, '').trim();
  await handleQuery(rawText, say, e.ts);
});

// ── Direct message handler ─────────────────────────────────────────
app.message(async ({ message, say }) => {
  const dm = message as GenericMessageEvent;
  if (dm.channel_type !== 'im') return;
  if ('subtype' in dm && dm.subtype) return;
  await handleQuery(dm.text?.trim() ?? '', say, dm.ts);
});

// ── /away slash command ────────────────────────────────────────────
app.command('/a-way', async ({ command, ack, say }) => {
  await ack();
  await handleQuery(command.text.trim(), say);
});

// ── Start ──────────────────────────────────────────────────────────
(async () => {
  const port = Number(process.env.PORT ?? 3000);
  await app.start(port);
  console.log(`A-WAY bot running on port ${port}`);
})();
