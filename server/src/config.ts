import { z } from 'zod';

/**
 * Kaikki ympäristömuuttujat luetaan ja validoidaan tässä yhdessä paikassa.
 * API-avaimia ei kirjoiteta koodiin missään vaiheessa.
 */
const schema = z.object({
  PORT: z.coerce.number().default(8787),
  LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  LLM_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),
  N8N_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  ADMIN_SYNC_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Virheellinen ympäristömuuttuja-asetus:');
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const config = {
  port: env.PORT,
  provider: env.LLM_PROVIDER,
  model: env.LLM_MODEL,
  anthropicKey: env.ANTHROPIC_API_KEY,
  openaiKey: env.OPENAI_API_KEY,

  /** Lista sallittuja origineja, tai '*' jos kaikki sallitaan. */
  allowedOrigins:
    env.ALLOWED_ORIGINS.trim() === '*'
      ? ('*' as const)
      : env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),

  n8nWebhookUrl: env.N8N_WEBHOOK_URL || undefined,
  n8nWebhookSecret: env.N8N_WEBHOOK_SECRET,

  /** Jaettu salaisuus POST /admin/sync -kutsulle. Tyhja = endpoint pois kaytosta. */
  adminSyncSecret: env.ADMIN_SYNC_SECRET,
};

export type Config = typeof config;
