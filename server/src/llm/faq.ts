import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

export interface FaqRow {
  id: number;
  kategoria: string;
  kysymys: string;
  vastaus: string;
  avainsanat: string[];
  lahdeUrl: string;
}

export interface BotData {
  botId: string;
  /** Botin nimi, esim. "Cusco" */
  nimi: string;
  /** Lyhyt kuvaus joka menee system promptiin */
  kuvaus: string;
  /** Mitä botti vastaa kun aineistosta ei löydy vastausta */
  fallbackViesti: string;
  paivitetty: string;
  rivit: FaqRow[];
}

const DATA_DIR = join(process.cwd(), 'data');

export class UnknownBotError extends Error {
  constructor(botId: string) {
    super(`Tuntematon botId: ${botId}`);
    this.name = 'UnknownBotError';
  }
}

/**
 * botId tulee widgetin data-attribuutista, eli se on käyttäjän hallitsemaa
 * syötettä. Ilman tätä tarkistusta arvo kuten "../../etc/passwd" lukisi
 * tiedostoja data-hakemiston ulkopuolelta.
 */
const SAFE_BOT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function isValidBotId(botId: string): boolean {
  return SAFE_BOT_ID.test(botId) && basename(botId) === botId;
}

/** Välimuisti per botti. mtime-vertailu, jotta synkronointi näkyy ilman restarttia. */
const cache = new Map<string, { mtimeMs: number; data: BotData }>();

export function loadBot(botId: string): BotData {
  if (!isValidBotId(botId)) throw new UnknownBotError(botId);

  const path = join(DATA_DIR, `${botId}.json`);

  let mtimeMs: number;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    throw new UnknownBotError(botId);
  }

  const hit = cache.get(botId);
  if (hit && hit.mtimeMs === mtimeMs) return hit.data;

  const data = JSON.parse(readFileSync(path, 'utf8')) as BotData;
  cache.set(botId, { mtimeMs, data });
  console.log(`[faq] ${botId}: ${data.rivit.length} riviä (päivitetty ${data.paivitetty})`);
  return data;
}

/** Listaa data-hakemistosta löytyvät botit. Käytetään /health-vastauksessa. */
export function listBots(): string[] {
  try {
    return readdirSync(DATA_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Muotoilee koko aineiston system promptiin. Aineisto on pieni (~1 100
 * tokenia/botti), joten se mahtuu kokonaan mukaan eikä hakua tarvita - malli
 * näkee kaikki rivit kerralla eikä voi noutaa väärää.
 *
 * Jos yhdellä botilla on yli ~100 riviä tai ~20 000 tokenia, tämä pitää
 * vaihtaa hakuun (avainsanahaku riittää pitkälle, vektorikanta vasta sitten).
 */
export function faqAsText(data: BotData): string {
  return data.rivit
    .map((r) =>
      [
        `[${r.id}] ${r.kategoria}`,
        `K: ${r.kysymys}`,
        `V: ${r.vastaus}`,
        `Avainsanat: ${r.avainsanat.join(', ')}`,
        `Lähde: ${r.lahdeUrl}`,
      ].join('\n'),
    )
    .join('\n\n');
}
