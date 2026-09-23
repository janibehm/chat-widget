import { useEffect, useRef, useState } from 'preact/hooks';
import type { WidgetConfig } from './config.js';
import type { ChatMessage } from './types.js';
import { streamChat, fetchMeta, type BotMeta } from './api.js';
import { loadHistory, saveHistory, sessionId } from './storage.js';
import { LeadForm } from './LeadForm.js';

export function App({ cfg }: { cfg: WidgetConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(cfg.botId));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<BotMeta | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const sid = useRef(sessionId(cfg.botId));

  useEffect(() => saveHistory(cfg.botId, messages), [messages, cfg.botId]);

  // Pikakysymykset haetaan vasta kun widget avataan - turha kuormittaa
  // isäntäsivun latausta jos kukaan ei avaa chattia.
  useEffect(() => {
    if (open && !meta) void fetchMeta(cfg.apiUrl, cfg.botId).then(setMeta);
  }, [open, meta, cfg.apiUrl, cfg.botId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError(null);

    try {
      let acc = '';
      await streamChat({
        apiUrl: cfg.apiUrl,
        botId: cfg.botId,
        sessionId: sid.current,
        messages: next,
        onDelta: (delta) => {
          acc += delta;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { role: 'assistant', content: acc }];
            }
            return [...prev, { role: 'assistant', content: acc }];
          });
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yhteysvirhe');
    } finally {
      setBusy(false);
    }
  }

  /** Viimeisin käyttäjän kysymys esitäytetään lomakkeeseen. */
  const viimeisinKysymys = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (!open) {
    return (
      <div class="root">
        <button class="launcher" onClick={() => setOpen(true)} aria-label={cfg.title}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.7 1.4 5.1 3.7 6.7L5 21.5l3.7-1.8c1 .3 2.1.4 3.3.4 5.5 0 10-3.9 10-8.7S17.5 3 12 3Z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div class="root">
      <div class="panel" role="dialog" aria-label={cfg.title}>
        <div class="header">
          <span>{cfg.title}</span>
          <button class="close" onClick={() => setOpen(false)} aria-label="Sulje">×</button>
        </div>

        {leadOpen ? (
          <LeadForm
            cfg={cfg}
            sessionId={sid.current}
            keskustelu={messages}
            esitaytettyKysymys={viimeisinKysymys}
            onClose={() => setLeadOpen(false)}
          />
        ) : (
          <>
            <div class="messages" ref={listRef}>
              {messages.length === 0 && (
                <div class="tervetuloa">
                  <p>Hei! Kysy meiltä mitä vain — tai valitse aihe:</p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} class={`msg ${m.role}`}>{m.content}</div>
              ))}

              {busy && messages[messages.length - 1]?.role === 'user' && (
                <div class="typing"><span /><span /><span /></div>
              )}
              {error && <div class="msg error">{error}</div>}
            </div>

            {messages.length === 0 && meta && meta.ehdotukset.length > 0 && (
              <div class="chips">
                {meta.ehdotukset.map((e) => (
                  <button key={e.kategoria} class="chip" onClick={() => void send(e.kysymys)}>
                    {e.kategoria}
                  </button>
                ))}
              </div>
            )}

            <form class="composer" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
              <input
                value={input}
                placeholder="Kirjoita viesti..."
                onInput={(e) => setInput((e.target as HTMLInputElement).value)}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !input.trim()}>Lähetä</button>
            </form>

            <button class="lead-open" onClick={() => setLeadOpen(true)}>
              Jätä yhteydenottopyyntö
            </button>
          </>
        )}
      </div>
    </div>
  );
}
