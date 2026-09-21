import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { describeModel } from './llm/client.js';
import { chatRoute } from './routes/chat.js';
import { adminRoute } from './routes/admin.js';
import { listBots } from './llm/faq.js';

const app = new Hono();

/**
 * CORS on pakollinen: widget ladataan vieraille domaineille, joten pyynnöt
 * tulevat aina eri originista kuin tämä palvelin. Sallitut originit tulevat
 * ALLOWED_ORIGINS-ympäristömuuttujasta.
 */
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (config.allowedOrigins === '*') return origin ?? '*';
      return config.allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true, model: describeModel(), bots: listBots() }));

app.route('/', chatRoute);
app.route('/', adminRoute);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`chat-widget server: http://localhost:${info.port}`);
  console.log(`  malli  : ${describeModel()}`);
  console.log(`  CORS   : ${config.allowedOrigins === '*' ? '* (kaikki)' : config.allowedOrigins.join(', ')}`);
  console.log(`  n8n    : ${config.n8nWebhookUrl ? 'käytössä' : 'ei konfiguroitu'}`);
  console.log(`  botit  : ${listBots().join(', ') || '(ei yhtään data-hakemistossa)'}`);
  console.log(`  sync   : ${config.adminSyncSecret ? 'käytössä' : 'pois käytöstä (ADMIN_SYNC_SECRET puuttuu)'}`);
});
