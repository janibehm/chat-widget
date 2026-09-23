import type { WidgetConfig } from './config.js';

/**
 * ===========================================================================
 * TYYLIT - tätä muokataan ulkoasun säätöön.
 * ===========================================================================
 * Palautetaan merkkijonona ja injektoidaan shadow rootiin, jolloin isäntäsivun
 * CSS ei pääse vaikuttamaan näihin eivätkä nämä vuoda ulos.
 * `all: initial` nollaa perityt arvot varmuuden vuoksi juuritasolla.
 */
export function styles(cfg: WidgetConfig): string {
  const side = cfg.position === 'bottom-left' ? 'left' : 'right';

  return `
  :host { all: initial; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .root {
    position: fixed;
    bottom: 20px;
    ${side}: 20px;
    z-index: 2147483000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #111827;
  }

  .launcher {
    width: 56px; height: 56px;
    border: none; border-radius: 50%;
    background: ${cfg.color};
    color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,.24);
    transition: transform .15s ease;
  }
  .launcher:hover { transform: scale(1.05); }
  .launcher svg { width: 26px; height: 26px; }

  .panel {
    position: absolute;
    bottom: 72px; ${side}: 0;
    width: 380px; height: 560px; max-height: calc(100vh - 120px);
    background: #fff; border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,.18);
    display: flex; flex-direction: column; overflow: hidden;
  }

  .header {
    background: ${cfg.color}; color: #fff;
    padding: 14px 16px;
    display: flex; align-items: center; justify-content: space-between;
    font-weight: 600;
  }
  .close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; line-height: 1; }

  .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #F9FAFB; }

  .msg { max-width: 80%; padding: 9px 13px; border-radius: 14px; white-space: pre-wrap; word-wrap: break-word; }
  .msg.user { align-self: flex-end; background: ${cfg.color}; color: #fff; border-bottom-right-radius: 4px; }
  .msg.assistant { align-self: flex-start; background: #fff; border: 1px solid #E5E7EB; border-bottom-left-radius: 4px; }
  .msg.error { align-self: center; background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; font-size: 13px; }

  .typing { align-self: flex-start; display: flex; gap: 4px; padding: 12px 14px; background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; }
  .typing span { width: 7px; height: 7px; border-radius: 50%; background: #9CA3AF; animation: blink 1.4s infinite both; }
  .typing span:nth-child(2) { animation-delay: .2s; }
  .typing span:nth-child(3) { animation-delay: .4s; }
  @keyframes blink { 0%,80%,100% { opacity: .3 } 40% { opacity: 1 } }

  .composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #E5E7EB; background: #fff; }
  .composer input {
    flex: 1; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 9px;
    font: inherit; color: inherit; outline: none;
  }
  .composer input:focus { border-color: ${cfg.color}; }
  .composer button {
    border: none; border-radius: 9px; background: ${cfg.color}; color: #fff;
    padding: 0 16px; cursor: pointer; font: inherit; font-weight: 600;
  }
  .composer button:disabled { opacity: .45; cursor: default; }

  .tervetuloa { color: #6B7280; font-size: 13px; padding: 4px 2px; }

  /* Pikavalinnat - kategoriat tulevat UKK-aineistosta */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px 0; background: #fff; }
  .chip {
    border: 1px solid ${cfg.color}; background: #fff; color: ${cfg.color};
    border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer;
  }
  .chip:hover { background: ${cfg.color}; color: #fff; }

  .lead-open {
    border: none; border-top: 1px solid #E5E7EB; background: #fff; color: ${cfg.color};
    padding: 10px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%;
  }
  .lead-open:hover { background: #F9FAFB; }

  /* Yhteydenottolomake */
  .lead { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #fff; }
  .lead-intro { color: #6B7280; font-size: 13px; }
  .lead label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; color: #374151; }
  .lead input, .lead textarea {
    border: 1px solid #D1D5DB; border-radius: 9px; padding: 9px 11px;
    font: inherit; font-weight: 400; color: #111827; outline: none; resize: vertical;
  }
  .lead input:focus, .lead textarea:focus { border-color: ${cfg.color}; }
  .lead-error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
  .lead-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .lead-actions button {
    border: none; border-radius: 9px; padding: 9px 16px; font: inherit; font-weight: 600; cursor: pointer;
    background: ${cfg.color}; color: #fff;
  }
  .lead-actions button:disabled { opacity: .45; cursor: default; }
  .lead-cancel { background: #F3F4F6 !important; color: #374151 !important; }
  .lead-done { text-align: center; padding: 24px 8px; display: flex; flex-direction: column; gap: 10px; }
  .lead-done p { color: #6B7280; font-size: 14px; }
  .lead-back {
    border: none; border-radius: 9px; background: ${cfg.color}; color: #fff;
    padding: 9px 16px; font: inherit; font-weight: 600; cursor: pointer; align-self: center;
  }

  /* Mobiilissa paneeli vie käytännössä koko ruudun. */
  @media (max-width: 480px) {
    .root { bottom: 16px; ${side}: 16px; }
    .panel {
      position: fixed; inset: 0;
      width: 100vw; height: 100dvh; max-height: none;
      border-radius: 0;
    }
  }
  `;
}
