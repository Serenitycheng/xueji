import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle-vercel',
  schema: './db/vercel-schema.ts',
  dialect: 'postgresql',
});
