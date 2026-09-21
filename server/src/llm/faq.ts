import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface FaqRow {
  id: number;
  kategoria: string;
  kysymys: string;
  vastaus: string;
  avainsanat: string[];
  lahdeUrl: string;
}

export interface FaqDoc {
  botId: string;
  paivitetty: string;
  rivit: FaqRow[];
}

/**
 * UKK-aineisto luetaan levyltä, ei käännetä bundleen. Näin n8n-synkronointi
 * voi myöhemmin vain ylikirjoittaa tiedoston, ja palvelin huomaa muutoksen
 * ilman uudelleenkäynnistystä (mtime-tarkistus alla).
 */
const FAQ_PATH = join(process.cwd(), 'data', 'faq.json');

let cache: { mtimeMs: number; doc: FaqDoc } | null = null;

export function loadFaq(): FaqDoc {
  const { mtimeMs } = statSync(FAQ_PATH);
  if (cache && cache.mtimeMs === mtimeMs) return cache.doc;

  const doc = JSON.parse(readFileSync(FAQ_PATH, 'utf8')) as FaqDoc;
  cache = { mtimeMs, doc };
  console.log(`[faq] ladattu ${doc.rivit.length} riviä (päivitetty ${doc.paivitetty})`);
  return doc;
}

/**
 * Muotoilee koko aineiston system promptiin. Aineisto on pieni (~1 100
 * tokenia), joten se mahtuu kokonaan mukaan eikä hakua tarvita - malli näkee
 * kaikki rivit kerralla eikä voi noutaa väärää.
 *
 * Jos rivejä tulee yli ~100 tai aineisto ylittää ~20 000 tokenia, tämä pitää
 * vaihtaa hakuun (avainsanahaku riittää pitkälle, vektorikanta vasta sitten).
 */
export function faqAsText(doc: FaqDoc): string {
  return doc.rivit
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
