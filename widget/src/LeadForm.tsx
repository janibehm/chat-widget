import { useState } from 'preact/hooks';
import type { WidgetConfig } from './config.js';
import type { ChatMessage } from './types.js';
import { sendLead } from './api.js';

/**
 * Yhteydenottolomake. Tarkoituksella erillinen lomake eikä chatin kautta
 * kysyminen: näin nimi ja sähköposti saadaan rakenteisena datana eikä
 * mallin tulkinnan varassa, ja kentät voi validoida ennen lähetystä.
 */
export function LeadForm({
  cfg,
  sessionId,
  keskustelu,
  esitaytettyKysymys,
  onClose,
}: {
  cfg: WidgetConfig;
  sessionId: string;
  keskustelu: ChatMessage[];
  esitaytettyKysymys: string;
  onClose: () => void;
}) {
  const [nimi, setNimi] = useState('');
  const [sahkoposti, setSahkoposti] = useState('');
  const [kysymys, setKysymys] = useState(esitaytettyKysymys);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const res = await sendLead({
      apiUrl: cfg.apiUrl,
      botId: cfg.botId,
      sessionId,
      lead: { nimi: nimi.trim(), sahkoposti: sahkoposti.trim(), kysymys: kysymys.trim() },
      keskustelu,
    });

    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  if (done) {
    return (
      <div class="lead">
        <div class="lead-done">
          <strong>Kiitos!</strong>
          <p>Otamme sinuun yhteyttä pian osoitteeseen {sahkoposti}.</p>
          <button class="lead-back" onClick={onClose}>Takaisin chattiin</button>
        </div>
      </div>
    );
  }

  return (
    <form class="lead" onSubmit={submit}>
      <p class="lead-intro">Jätä yhteystietosi, niin palaamme asiaan.</p>

      <label>
        Nimi
        <input value={nimi} onInput={(e) => setNimi((e.target as HTMLInputElement).value)}
               required disabled={busy} autocomplete="name" />
      </label>

      <label>
        Sähköposti
        <input type="email" value={sahkoposti} autocomplete="email" required disabled={busy}
               onInput={(e) => setSahkoposti((e.target as HTMLInputElement).value)} />
      </label>

      <label>
        Kysymyksesi
        <textarea rows={3} value={kysymys} required disabled={busy}
                  onInput={(e) => setKysymys((e.target as HTMLTextAreaElement).value)} />
      </label>

      {error && <div class="lead-error">{error}</div>}

      <div class="lead-actions">
        <button type="button" class="lead-cancel" onClick={onClose} disabled={busy}>Peruuta</button>
        <button type="submit" disabled={busy}>{busy ? 'Lähetetään…' : 'Lähetä'}</button>
      </div>
    </form>
  );
}
