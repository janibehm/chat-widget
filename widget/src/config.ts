/**
 * Widgetin asetukset luetaan <script>-tagin data-attribuuteista.
 * Mitään ei kovakoodata - oletukset ovat tässä yhdessä paikassa.
 */
export interface WidgetConfig {
  botId: string;
  apiUrl: string;
  color: string;
  position: 'bottom-right' | 'bottom-left';
  title: string;
}

/** ==== MUOKKAA TÄSTÄ: oletusarvot ==== */
const DEFAULTS = {
  color: '#4F46E5',
  position: 'bottom-right' as const,
  title: 'Chat',
};

/** Etsii oman <script>-tagin. Toimii myös async-latauksessa. */
function findOwnScript(): HTMLScriptElement | null {
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  // Varalla: jos currentScript ei ole saatavilla, etsi data-bot-id:n perusteella.
  return document.querySelector<HTMLScriptElement>('script[data-bot-id]');
}

export function readConfig(): WidgetConfig | null {
  const el = findOwnScript();
  if (!el) {
    console.error('[chat-widget] script-tagia ei löytynyt');
    return null;
  }

  const botId = el.dataset.botId;
  if (!botId) {
    console.error('[chat-widget] data-bot-id puuttuu - widget ei käynnisty');
    return null;
  }

  // Oletus: sama origin kuin mistä widget.js ladattiin.
  const apiUrl = el.dataset.apiUrl || new URL(el.src, location.href).origin;

  const position = el.dataset.position === 'bottom-left' ? 'bottom-left' : DEFAULTS.position;

  return {
    botId,
    apiUrl: apiUrl.replace(/\/$/, ''),
    color: el.dataset.color || DEFAULTS.color,
    position,
    title: el.dataset.title || DEFAULTS.title,
  };
}
