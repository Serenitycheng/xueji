import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './vercel-schema';

export function getDb() {
  if (!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
  return drizzle(process.env.DATABASE_URL, { schema });
}
