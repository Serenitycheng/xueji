import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {neon} from '@neondatabase/serverless';
import {randomUUID} from 'node:crypto';
process.loadEnvFile('.env.local');
const schema='studyflow_test_'+randomUUID().replaceAll('-','');
if(!/^studyflow_test_[a-f0-9]{32}$/.test(schema))throw new Error('Invalid isolated schema');
const sql=neon(process.env.DATABASE_URL);await sql.query('CREATE SCHEMA '+schema);
try{
 const statements=(await Promise.all(['0000_daffy_quentin_quire.sql','0001_remarkable_talon.sql','0002_material_jobs.sql','0003_learning_flow_protocol.sql','0004_development_protocol.sql'].map(f=>readFile('drizzle-vercel/'+f,'utf8')))).flatMap(s=>s.split('--> statement-breakpoint').filter(x=>x.trim()));
 await sql.transaction([sql.query('SET LOCAL search_path TO '+schema),...statements.map(s=>sql.query(s))]);
 // Inject a transaction-local schema into the actual application adapter. No
 // production code path or user profile is changed by these integration tests.
 await build({entryPoints:['tests/protection.integration.ts'],bundle:true,platform:'node',format:'esm',packages:'external',alias:{'next/headers':'next/headers.js'},outfile:'work/tests/protection.integration.mjs',plugins:[{name:'isolated-database',setup(build){build.onLoad({filter:/lib[\\/]database\.ts$/},async(args)=>{let contents=await readFile(args.path,'utf8');contents=contents.replace('writes.map(w=>sql.query(w.query,w.params))',`[sql.query('SET LOCAL search_path TO ${schema}'),...writes.map(w=>sql.query(w.query,w.params))]`);contents=contents.replace('const execute=(values:unknown[])=>sql.query(query,values);',`const execute=async(values:unknown[])=>{const r=await sql.transaction([sql.query('SET LOCAL search_path TO ${schema}'),sql.query(query,values)]);return r[1];};`);return {contents,loader:'ts'};});}}]});
 await import('../work/tests/protection.integration.mjs');
}finally{await sql.query('DROP SCHEMA '+schema+' CASCADE');console.log('Isolated test schema removed; production records unchanged.');}
