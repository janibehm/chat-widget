import { config } from '../config.js';

/**
 * ===========================================================================
 * n8n-KOUKKU - tätä laajennetaan kun uusia automaatioita tarvitaan.
 * ===========================================================================
 * Lisää uusi tapahtuma laajentamalla N8nEvent-unionia ja kutsumalla
 * notifyN8n('uusi.tapahtuma', { ... }) siitä kohtaa missä se tapahtuu.
 * n8n:n puolella Webhook-node erottelee tapahtumat "event"-kentän perusteella.
 */
export type N8nEvent =
  | 'conversation.started'
  | 'conversation.ended'
  | 'lead.captured'
  | 'message.flagged';

export interface N8nPayload {
  botId: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Lähettää tapahtuman n8n:n webhookiin. Ei koskaan heitä poikkeusta eikä
 * hidasta chat-vastausta: virhe vain lokitetaan, koska automaation
 * epäonnistuminen ei saa rikkoa käyttäjän keskustelua.
 */
export async function notifyN8n(event: N8nEvent, payload: N8nPayload): Promise<void> {
  if (!config.n8nWebhookUrl) return; // ei konfiguroitu - ohitetaan hiljaa

  const body = {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.n8nWebhookSecret) headers['X-Webhook-Secret'] = config.n8nWebhookSecret;

    const res = await fetch(config.n8nWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[n8n] ${event} -> HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[n8n] ${event} epäonnistui:`, err instanceof Error ? err.message : err);
  }
}
