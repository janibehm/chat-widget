import { render } from 'preact';
import { App } from './App.js';
import { readConfig } from './config.js';
import { styles } from './styles.js';

/**
 * Widgetin käynnistys. Luo oman containerin, avaa sille shadow rootin ja
 * renderöi Preact-sovelluksen sinne. Shadow DOM on kriittinen: widget
 * upotetaan vieraille sivustoille, joten isäntäsivun CSS ei saa vaikuttaa
 * widgetiin eikä widgetin tyylien vuotaa isäntäsivulle.
 */
function boot() {
  const cfg = readConfig();
  if (!cfg) return;

  // Estä kaksoislataus jos script-tagi on vahingossa sivulla kahdesti.
  if (document.getElementById('chat-widget-root')) return;

  const host = document.createElement('div');
  host.id = 'chat-widget-root';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const sheet = document.createElement('style');
  sheet.textContent = styles(cfg);
  shadow.appendChild(sheet);

  const mount = document.createElement('div');
  shadow.appendChild(mount);

  render(<App cfg={cfg} />, mount);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
