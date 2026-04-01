const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const EMBEDDING_MODEL = 'voyage-3'; // 1024-dim, optimised for retrieval

/**
 * Generate an embedding vector using Voyage AI.
 * Returns null if VOYAGE_API_KEY is not set so callers can gracefully
 * fall back to keyword search without crashing.
 */
export async function embed(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.warn('VOYAGE_API_KEY not set — skipping embedding, using keyword fallback');
    return null;
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text.slice(0, 32000)], // voyage-3 supports up to 32k tokens
      input_type: 'document',        // 'document' for storage, 'query' for search
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Voyage AI embedding error:', res.status, err);
    return null;
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0]?.embedding ?? null;
}

/**
 * Embed a search query (uses input_type: 'query' for better retrieval accuracy).
 */
export async function embedQuery(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text.slice(0, 32000)],
      input_type: 'query',
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Voyage AI query embedding error:', res.status, err);
    return null;
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0]?.embedding ?? null;
}
