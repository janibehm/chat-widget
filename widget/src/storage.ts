import type { ChatMessage } from './types.js';

/**
 * Keskusteluhistoria säilyy istunnon ajan sessionStorage:ssa, jotta konteksti
 * ei katoa sivunvaihdossa. Kaikki kutsut on suojattu try/catchilla, koska
 * sessionStorage heittää mm. privaatti-ikkunassa ja evästeet estettynä.
 */
const keyFor = (botId: string) => `chat-widget:${botId}`;

export function loadHistory(botId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(keyFor(botId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(botId: string, messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(keyFor(botId), JSON.stringify(messages));
  } catch {
    // Tila täynnä tai storage estetty - widget toimii silti, historia ei säily.
  }
}

/** Istuntotunniste, joka kulkee n8n:lle asti tapahtumien mukana. */
export function sessionId(botId: string): string {
  const k = `${keyFor(botId)}:sid`;
  try {
    let sid = sessionStorage.getItem(k);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(k, sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}
