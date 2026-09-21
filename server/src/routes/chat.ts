import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { streamText } from 'ai';
import { z } from 'zod';
import { getModel } from '../llm/client.js';
import { systemPromptFor } from '../llm/prompt.js';
import { notifyN8n } from '../n8n/notify.js';

const bodySchema = z.object({
  botId: z.string().min(1),
  sessionId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1),
});

export const chatRoute = new Hono();

/**
 * POST /chat
 * Ottaa koko keskusteluhistorian vastaan ja striimaa vastauksen takaisin
 * Server-Sent Events -muodossa. Kehykset:
 *   data: {"type":"delta","text":"..."}   - yksi tokenpala
 *   data: {"type":"done"}                 - vastaus valmis
 *   data: {"type":"error","message":"..."} - virhe kesken striimin
 *
 * SSE on tarkoituksella valittu AI SDK:n oman stream-protokollan sijaan,
 * jotta widget pärjää pelkällä fetchillä ilman client-kirjastoa.
 */
chatRoute.post('/chat', async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Virheellinen pyyntörunko', details: z.treeifyError(parsed.error) }, 400);
  }

  const { botId, sessionId, messages } = parsed.data;

  // Ensimmäinen viesti = uusi keskustelu. Tästä n8n saa tiedon liidistä ajoissa.
  if (messages.length === 1) {
    void notifyN8n('conversation.started', { botId, sessionId, firstMessage: messages[0].content });
  }

  return streamSSE(c, async (stream) => {
    try {
      const result = streamText({
        model: getModel(),
        system: systemPromptFor(botId),
        messages,
      });

      let full = '';
      for await (const delta of result.textStream) {
        full += delta;
        await stream.writeSSE({ data: JSON.stringify({ type: 'delta', text: delta }) });
      }

      await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });

      // TODO: tähän kohtaan lisätään liidin tunnistus (esim. sähköposti
      // vastauksessa tai käyttäjän viestissä) -> notifyN8n('lead.captured', ...)
      void full;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tuntematon virhe';
      console.error('[chat] striimaus epäonnistui:', message);
      await stream.writeSSE({ data: JSON.stringify({ type: 'error', message }) });
    }
  });
});
