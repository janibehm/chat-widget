# chat-widget

Upotettava chat-widget, jonka saa mille tahansa sivustolle yhdellä `<script>`-tagilla.

- `/widget` — Preact-widget, buildautuu yhdeksi itsenäiseksi `widget.js`-tiedostoksi (~8 kB gzip)
- `/server` — Hono-backend, joka hoitaa LLM-kutsut ja striimaa vastauksen

## Pika-aloitus

```bash
pnpm install
cp server/.env.example server/.env   # täytä API-avain
pnpm dev                             # käynnistää widgetin ja palvelimen
```

Widgetin kehitysdemo: http://localhost:5173 — sivulla on tarkoituksella rumia
globaaleja tyylejä, joten näet heti toimiiko Shadow DOM -eristys.
Palvelin: http://localhost:8787/health

## Upotus

```html
<script src="https://esim.com/widget.js"
  data-bot-id="abc123"
  data-color="#4F46E5"
  data-position="bottom-right"
  async></script>
```

| Attribuutti | Pakollinen | Oletus | Selitys |
|---|---|---|---|
| `data-bot-id` | kyllä | — | Botin tunniste, kulkee backendille asti |
| `data-api-url` | ei | sama origin kuin widget.js | Backendin osoite |
| `data-color` | ei | `#4F46E5` | Pääväri |
| `data-position` | ei | `bottom-right` | `bottom-right` tai `bottom-left` |
| `data-title` | ei | `Chat` | Chat-ikkunan otsikko |

## Widgetin buildaus ja jakelu

```bash
pnpm build:widget      # -> widget/dist/widget.js
```

Tuloksena on yksi tiedosto ilman ulkoisia riippuvuuksia. Laita se mihin tahansa
staattiseen jakeluun (S3 + CloudFront, Cloudflare R2, Vercel, oma nginx) ja osoita
`<script src>` sinne. Muista CORS: lisää asiakkaan domain palvelimen
`ALLOWED_ORIGINS`-muuttujaan, muuten selain estää `/chat`-kutsun.

### WordPress

Ulkoasu → Teematiedoston muokkaus → `footer.php`, lisää juuri ennen `</body>`:

```html
<script src="https://esim.com/widget.js" data-bot-id="abc123" async></script>
```

Siistimmin ilman teeman muokkausta: asenna *WPCode* tai *Insert Headers and
Footers* ja liitä sama pätkä Footer-kenttään. Näin skripti säilyy teeman
päivityksen yli.

### Next.js

`app/layout.tsx` (App Router):

```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>
        {children}
        <Script
          src="https://esim.com/widget.js"
          data-bot-id="abc123"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

`strategy="afterInteractive"` vastaa `async`-lataamista. Älä käytä
`beforeInteractive`, widget ei tarvitse sitä ja se hidastaa ensilatausta.

### Webflow

Project Settings → Custom Code → Footer Code, liitä script-tagi ja julkaise.
Yhden sivun widget: Page Settings → Before `</body>` tag.

### Staattinen HTML

Script-tagi juuri ennen `</body>`.

## Rakenne

```
widget/src/
  index.tsx     Käynnistys: container, shadow root, Preact-render
  config.ts     data-attribuuttien luku + OLETUSARVOT
  styles.ts     Kaikki CSS merkkijonona -> shadow root
  App.tsx       Chat-UI: viestilista, kirjoitusindikaattori, lomake
  api.ts        SSE-striimin luku fetchillä
  storage.ts    Keskusteluhistoria sessionStoragessa

server/src/
  index.ts          Hono-app, CORS, käynnistys
  config.ts         Ympäristömuuttujien luku ja validointi
  routes/chat.ts    POST /chat, SSE-striimaus
  llm/client.ts     Tarjoajan vaihto (anthropic | openai)
  llm/faq.ts        Bottikohtaisen aineiston lataus + välimuisti
  llm/prompt.ts     SYSTEM PROMPT - botista riippumaton
  n8n/notify.ts     notifyN8n(event, payload)

server/data/
  <botId>.json      Yksi tiedosto per botti - aineisto JA aiherajaus
```

## Uuden botin lisääminen

Luo `server/data/<botId>.json`. **Koodiin ei kosketa.**

```json
{
  "botId": "asiakas2",
  "nimi": "Kahvila Aurora",
  "kuvaus": "tamperelainen kahvila ja leipomo",
  "fallbackViesti": "En osaa vastata tuohon. Soita meille: 040 123 4567",
  "paivitetty": "2026-09-21",
  "rivit": [
    {
      "id": 1,
      "kategoria": "Aukioloajat",
      "kysymys": "Milloin olette auki?",
      "vastaus": "Olemme auki ma-pe 8-18, la 9-16 ja su suljettu.",
      "avainsanat": ["aukiolo", "auki", "sunnuntai"],
      "lahdeUrl": "https://esimerkki.fi/aukioloajat"
    }
  ]
}
```

Sitten `data-bot-id="asiakas2"` script-tagiin. `GET /health` listaa käytössä
olevat botit.

Aineisto on samalla botin **aiherajaus**: botti vastaa vain siihen mitä
riveissä on, muuhun se vastaa `fallbackViesti`-tekstillä. Uusi aihe otetaan
käyttöön lisäämällä rivi, ei promptia muokkaamalla.

Tiedosto luetaan levyltä ajonaikana ja välimuistitetaan mtime-leimalla, joten
ylikirjoitus (esim. n8n-synkronointi Sheetsista) näkyy ilman palvelimen
uudelleenkäynnistystä.

## Mitä todennäköisimmin muokkaat

| Mitä | Missä |
|---|---|
| Värit, koot, mobiilikäyttäytyminen | `widget/src/styles.ts` |
| Oletusväri / -otsikko / -sijainti | `widget/src/config.ts` → `DEFAULTS` |
| Botin persoona ja ohjeet | `server/src/llm/prompt.ts` |
| Malli ja tarjoaja | `server/.env` (`LLM_PROVIDER`, `LLM_MODEL`) |
| Uudet n8n-tapahtumat | `server/src/n8n/notify.ts` → `N8nEvent` |

## n8n-integraatio

`notifyN8n(event, payload)` lähettää POSTin `N8N_WEBHOOK_URL`-osoitteeseen.
Runko on aina muotoa:

```json
{ "event": "conversation.started", "timestamp": "...", "botId": "abc123", "sessionId": "..." }
```

n8n:ssä: Webhook-node vastaanottaa, Switch-node haarauttaa `event`-kentän
perusteella. Jos `N8N_WEBHOOK_SECRET` on asetettu, se tulee
`X-Webhook-Secret`-otsakkeessa — tarkista se n8n:n päässä.

Kutsu ei koskaan kaada chat-vastausta: virhe vain lokitetaan.

Uusi tapahtuma lisätään laajentamalla `N8nEvent`-unionia ja kutsumalla
funktiota siitä kohtaa missä tapahtuma syntyy.

## Striimausprotokolla

`POST /chat` palauttaa Server-Sent Eventsiä:

```
data: {"type":"delta","text":"Hei"}
data: {"type":"done"}
data: {"type":"error","message":"..."}
```

Tämä on valittu AI SDK:n oman stream-protokollan sijaan tarkoituksella:
widget pärjää pelkällä `fetch`illä eikä tarvitse client-kirjastoa, mikä pitää
bundlen pienenä.

## Aineiston synkronointi Google Sheetsista (n8n)

`POST /admin/sync` ottaa vastaan bottikohtaisen aineiston ja kirjoittaa
`data/<botId>.json`. Tunnistautuminen `X-Sync-Secret`-otsakkeella, arvo
`ADMIN_SYNC_SECRET`. Jos muuttujaa ei ole asetettu, endpoint on pois käytöstä.

Endpoint on tarkoituksella **validoiva portti**, ei pelkkä kirjoitus:

| Tilanne | Vastaus |
|---|---|
| Väärä tai puuttuva salaisuus | 401 |
| Tyhjä aineisto tai tyhjä kysymys/vastaus rivillä | 400 |
| Rivimäärä putoaa yli 50 % | 409, vanha aineisto jää voimaan |
| Kunnossa | 200, atominen kirjoitus |

Romahdussuoja estää tilanteen jossa taulukko tyhjenee vahingossa ja botti
menettää koko tietämyksensä. Tarkoituksellinen pudotus menee läpi kentällä
`"force": true`.

n8n-workflow `Cusco UKK -synkronointi` hoitaa haun:

```
Ajastus 15 min ─┐
                ├→ Lue UKK-taulukko → Muunna aineistoksi → Lähetä palvelimelle
Aja käsin ──────┘
```

Botin nimi, kuvaus ja fallback-viesti asetetaan **Muunna aineistoksi**
-noden alussa (`BOT`-objekti) - taulukossa on vain UKK-rivit.

Kun n8n pyörii Dockerissa ja palvelin hostilla, osoite on
`http://host.docker.internal:8787/admin/sync` - `localhost` osoittaisi
konttiin itseensä.

