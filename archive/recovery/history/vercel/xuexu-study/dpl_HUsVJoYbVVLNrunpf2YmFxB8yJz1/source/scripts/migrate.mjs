import {existsSync} from 'node:fs';
import {drizzle} from 'drizzle-orm/neon-http';
import {migrate} from 'drizzle-orm/neon-http/migrator';
for(const file of ['.env.local','.env.development.local'])if(existsSync(file))process.loadEnvFile(file);
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
await migrate(drizzle(process.env.DATABASE_URL),{migrationsFolder:'drizzle-vercel'});
console.log('Database migration completed.');
