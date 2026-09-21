import { Hono } from 'hono';
import { z } from 'zod';
import { writeFileSync, renameSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { isValidBotId, type BotData } from '../llm/faq.js';
import { notifyN8n } from '../n8n/notify.js';

const DATA_DIR = join(process.cwd(), 'data');

const rowSchema = z.object({
  id: z.coerce.number(),
  kategoria: z.string().default(''),
  kysymys: z.string().trim().min(1, 'kysymys ei saa olla tyhjä'),
  vastaus: z.string().trim().min(1, 'vastaus ei saa olla tyhjä'),
  avainsanat: z.array(z.string()).default([]),
  lahdeUrl: z.string().default(''),
});

const syncSchema = z.object({
  botId: z.string().refine(isValidBotId, 'Virheellinen botId'),
  nimi: z.string().trim().min(1),
  kuvaus: z.string().trim().min(1),
  fallbackViesti: z.string().trim().min(1),
  rivit: z.array(rowSchema).min(1, 'Aineisto ei saa olla tyhjä'),
  /** Ohittaa romahdussuojan. Käytä vain kun rivimäärän lasku on tarkoituksellinen. */
  force: z.boolean().default(false),
});

/**
 * Kuinka suuri osa riveistä saa kadota yhdellä synkronoinnilla.
 * Suojaa tilanteelta jossa Sheets-taulukko tyhjenee vahingossa tai haku
 * palauttaa vajaan tuloksen - silloin vanha aineisto jää voimaan.
 */
const ROMAHDUSRAJA = 0.5;

export const adminRoute = new Hono();

/**
 * POST /admin/sync
 * Ottaa vastaan bottikohtaisen aineiston ja kirjoittaa data/<botId>.json.
 * Tarkoitettu n8n:n ajastetulle synkronoinnille Google Sheetsista.
 *
 * Tunnistautuminen: X-Sync-Secret -otsake, arvo ADMIN_SYNC_SECRET.
 */
adminRoute.post('/admin/sync', async (c) => {
  if (!config.adminSyncSecret) {
    return c.json({ error: 'ADMIN_SYNC_SECRET ei ole asetettu - endpoint pois käytöstä' }, 503);
  }
  if (c.req.header('X-Sync-Secret') !== config.adminSyncSecret) {
    return c.json({ error: 'Virheellinen tai puuttuva X-Sync-Secret' }, 401);
  }

  const parsed = syncSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Virheellinen aineisto', details: z.treeifyError(parsed.error) }, 400);
  }

  const { botId, nimi, kuvaus, fallbackViesti, rivit, force } = parsed.data;
  const path = join(DATA_DIR, `${botId}.json`);

  // Romahdussuoja: verrataan nykyiseen aineistoon.
  let edellinenMaara = 0;
  if (existsSync(path)) {
    try {
      edellinenMaara = (JSON.parse(readFileSync(path, 'utf8')) as BotData).rivit.length;
    } catch {
      edellinenMaara = 0;
    }
  }

  if (!force && edellinenMaara > 0 && rivit.length < edellinenMaara * ROMAHDUSRAJA) {
    const viesti =
      `Hylätty: rivimäärä ${edellinenMaara} -> ${rivit.length}. ` +
      `Vanha aineisto jäi voimaan. Lähetä force: true jos muutos on tarkoituksellinen.`;
    console.warn(`[sync] ${botId}: ${viesti}`);
    void notifyN8n('sync.rejected', { botId, edellinenMaara, uusiMaara: rivit.length });
    return c.json({ error: viesti, edellinenMaara, uusiMaara: rivit.length }, 409);
  }

  const doc: BotData = {
    botId,
    nimi,
    kuvaus,
    fallbackViesti,
    paivitetty: new Date().toISOString().slice(0, 10),
    rivit,
  };

  // Atominen kirjoitus: tilapäistiedosto ensin, sitten rename. Näin palvelin
  // ei voi lukea puolikasta tiedostoa jos kirjoitus keskeytyy.
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);

  console.log(`[sync] ${botId}: ${edellinenMaara} -> ${rivit.length} riviä`);
  return c.json({ ok: true, botId, rivit: rivit.length, edellinenMaara });
});
