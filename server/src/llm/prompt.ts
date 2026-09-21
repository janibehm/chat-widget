/**
 * ===========================================================================
 * SYSTEM PROMPT - tätä muokataan todennäköisimmin.
 * ===========================================================================
 * botId välitetään mukana, joten voit palauttaa eri promptin eri boteille
 * (esim. hakemalla asiakaskohtaisen ohjeen tietokannasta).
 */
export function systemPromptFor(botId: string): string {
  return [
    'Olet ystävällinen ja tiivis asiakaspalveluassistentti verkkosivustolla.',
    'Vastaa samalla kielellä jolla käyttäjä kirjoittaa.',
    'Pidä vastaukset lyhyinä - tämä on chat-ikkuna, ei dokumentti.',
    'Jos et tiedä vastausta, sano se suoraan äläkä keksi.',
    `Botin tunniste: ${botId}.`,
  ].join('\n');
}
