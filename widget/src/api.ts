import type { ChatMessage } from './types.js';

/**
 * Lukee palvelimen SSE-striimiä ja kutsuu onDelta jokaiselle tokenpalalle.
 * Käyttää pelkkää fetchiä (ei EventSourcea), koska EventSource ei tue POSTia.
 */
export async function streamChat(opts: {
  apiUrl: string;
  botId: string;
  sessionId: string;
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const res = await fetch(`${opts.apiUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botId: opts.botId,
      sessionId: opts.sessionId,
      messages: opts.messages,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Palvelin vastasi ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE-kehykset erottuvat tyhjällä rivillä.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;

        try {
          const msg = JSON.parse(raw) as
            | { type: 'delta'; text: string }
            | { type: 'done' }
            | { type: 'error'; message: string };

          if (msg.type === 'delta') opts.onDelta(msg.text);
          else if (msg.type === 'error') throw new Error(msg.message);
        } catch (err) {
          if (err instanceof SyntaxError) continue; // keskeneräinen kehys
          throw err;
        }
      }
    }
  }
}

export interface BotMeta {
  nimi: string;
  ehdotukset: { kategoria: string; kysymys: string }[];
}

/** Haetaan widgetin avautuessa: pikakysymykset tulevat UKK-aineistosta. */
export async function fetchMeta(apiUrl: string, botId: string): Promise<BotMeta | null> {
  try {
    const res = await fetch(`${apiUrl}/bot/${encodeURIComponent(botId)}/meta`);
    if (!res.ok) return null;
    return (await res.json()) as BotMeta;
  } catch {
    return null; // pikavalinnat ovat lisamauste - ilman niitakin chat toimii
  }
}

export interface LeadInput {
  nimi: string;
  sahkoposti: string;
  kysymys: string;
}

export async function sendLead(opts: {
  apiUrl: string;
  botId: string;
  sessionId: string;
  lead: LeadInput;
  keskustelu: ChatMessage[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${opts.apiUrl}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId: opts.botId,
        sessionId: opts.sessionId,
        ...opts.lead,
        keskustelu: opts.keskustelu,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `Palvelin vastasi ${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Yhteysvirhe. Tarkista verkkoyhteys.' };
  }
}
