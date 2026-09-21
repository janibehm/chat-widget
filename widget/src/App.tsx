import { useEffect, useRef, useState } from 'preact/hooks';
import type { WidgetConfig } from './config.js';
import type { ChatMessage } from './types.js';
import { streamChat } from './api.js';
import { loadHistory, saveHistory, sessionId } from './storage.js';

export function App({ cfg }: { cfg: WidgetConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(cfg.botId));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const sid = useRef(sessionId(cfg.botId));

  useEffect(() => saveHistory(cfg.botId, messages), [messages, cfg.botId]);

  // Pidä näkymä alalaidassa kun viestejä tulee lisää.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(e?: Event) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
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
        messages: next, // koko historia mukaan, jotta konteksti säilyy
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

        <div class="messages" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} class={`msg ${m.role}`}>{m.content}</div>
          ))}
          {busy && messages[messages.length - 1]?.role === 'user' && (
            <div class="typing"><span /><span /><span /></div>
          )}
          {error && <div class="msg error">{error}</div>}
        </div>

        <form class="composer" onSubmit={send}>
          <input
            value={input}
            placeholder="Kirjoita viesti..."
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()}>Lähetä</button>
        </form>
      </div>
    </div>
  );
}
