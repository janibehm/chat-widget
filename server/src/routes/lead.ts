import { Hono } from 'hono';
import { z } from 'zod';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadBot, isValidBotId, UnknownBotError } from '../llm/faq.js';
import { notifyN8n } from '../n8n/notify.js';

const LEADS_DIR = join(process.cwd(), 'data', 'leads');

const leadSchema = z.object({
  botId: z.string().refine(isValidBotId, 'Virheellinen botId'),
  sessionId: z.string().optional(),
  nimi: z.string().trim().min(1, 'Nimi puuttuu').max(120),
  sahkoposti: z.email('Tarkista sähköpostiosoite'),
  kysymys: z.string().trim().min(1, 'Kysymys puuttuu').max(2000),
  /** Keskusteluhistoria liidin kontekstiksi - vapaaehtoinen */
  keskustelu: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
});

export const leadRoute = new Hono();

/**
 * GET /bot/:botId/meta
 * Widget hakee tämän avatessaan: otsikko ja pikakysymykset.
 *
 * Ehdotukset johdetaan UKK-aineistosta - yksi kysymys per kategoria. Näin
 * asiakas hallitsee pikavalintoja suoraan Sheets-taulukosta eikä widgetin
 * koodia tarvitse koskea.
 */
leadRoute.get('/bot/:botId/meta', (c) => {
  try {
    const bot = loadBot(c.req.param('botId'));

    const nahdyt = new Set<string>();
    const ehdotukset: { kategoria: string; kysymys: string }[] = [];
    for (const r of bot.rivit) {
      if (nahdyt.has(r.kategoria) || !r.kategoria) continue;
      nahdyt.add(r.kategoria);
      ehdotukset.push({ kategoria: r.kategoria, kysymys: r.kysymys });
      if (ehdotukset.length >= 4) break; // pieni ruutu - neljä riittää
    }

    return c.json({ nimi: bot.nimi, ehdotukset });
  } catch (err) {
    if (err instanceof UnknownBotError) return c.json({ error: 'Tuntematon botti' }, 404);
    throw err;
  }
});

/**
 * POST /lead
 * Ottaa vastaan yhteydenottopyynnön widgetin lomakkeesta.
 *
 * Liidi kirjoitetaan ENSIN levylle ja vasta sitten lähetetään n8n:lle.
 * Liidi on liiketoiminnan kannalta arvokkain data mitä tämä palvelu käsittelee,
 * eikä sitä saa menettää siksi että n8n sattuu olemaan alhaalla.
 */
leadRoute.post('/lead', async (c) => {
  const parsed = leadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const virheet = parsed.error.issues.map((i) => i.message);
    return c.json({ error: virheet[0] ?? 'Virheellinen lomake', virheet }, 400);
  }

  const { botId, sessionId, nimi, sahkoposti, kysymys, keskustelu } = parsed.data;

  try {
    loadBot(botId);
  } catch {
    return c.json({ error: 'Tuntematon botti' }, 404);
  }

  const lead = {
    aika: new Date().toISOString(),
    botId,
    sessionId,
    nimi,
    sahkoposti,
    kysymys,
    viesteja: keskustelu?.length ?? 0,
  };

  try {
    mkdirSync(LEADS_DIR, { recursive: true });
    appendFileSync(join(LEADS_DIR, `${botId}.jsonl`), JSON.stringify(lead) + '\n', 'utf8');
  } catch (err) {
    console.error('[lead] tallennus levylle epäonnistui:', err instanceof Error ? err.message : err);
  }

  console.log(`[lead] ${botId}: ${nimi} <${sahkoposti}>`);
  void notifyN8n('lead.captured', { ...lead, keskustelu });

  return c.json({ ok: true });
});
