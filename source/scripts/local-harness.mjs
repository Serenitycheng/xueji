// Test-only service adapters. No production credentials or network services.
import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
export async function createHarness() {
  const { PGlite } = await import(
    process.env.STUDY_PGLITE
      ? pathToFileURL(process.env.STUDY_PGLITE).href
      : '@electric-sql/pglite'
  );
  const pg = new PGlite();
  globalThis.__learningTestPg = pg;
  globalThis.__learningTestAuth = true;
  globalThis.__learningTestFiles = new Map();
  const journal = JSON.parse(
    await readFile('drizzle-vercel/meta/_journal.json', 'utf8'),
  );
  for (const e of journal.entries)
    await pg.exec(await readFile('drizzle-vercel/' + e.tag + '.sql', 'utf8'));
  const adapter = `export async function atomicWrite(writes){return globalThis.__learningTestPg.transaction(async tx=>{const out=[];for(const w of writes)out.push(await tx.query(w.query,w.params));return out;});}
 export function db(){return {prepare(statement){let i=0;const query=statement.replace(/\\?/g,()=>'$'+(++i));function bound(values){return {async first(){return (await globalThis.__learningTestPg.query(query,values)).rows[0]??null;},async run(){const r=await globalThis.__learningTestPg.query(query,values);return {meta:{changes:r.affectedRows}};}};}return {...bound([]),bind(...values){return bound(values);}};}}};`;
  const plugins = [
    {
      name: 'isolated-services',
      setup(b) {
        b.onLoad({ filter: /lib[\\/]database\.ts$/ }, () => ({
          contents: adapter,
          loader: 'ts',
        }));
        b.onLoad({ filter: /lib[\\/]session\.ts$/ }, () => ({
          contents:
            'export async function hasSession(){return globalThis.__learningTestAuth===true;}',
          loader: 'ts',
        }));
        b.onLoad({ filter: /lib[\\/]storage\.ts$/ }, () => ({
          contents: `export function files(){return {async get(key){const data=globalThis.__learningTestFiles.get(key);return data===undefined?null:new Response(data);}};} export async function saveMaterialText(){throw new Error('Text upload is outside this isolated test');}`,
          loader: 'ts',
        }));
      },
    },
  ];
  const dir = 'work/tests/local';
  await mkdir(dir, { recursive: true });
  const entries = [
    'tests/protection.integration.ts',
    'app/api/study/route.ts',
    'app/api/history/route.ts',
    'app/api/materials/route.ts',
    'app/api/development-plan/route.ts',
    'lib/server.ts',
    'lib/model.ts',
  ];
  await build({
    entryPoints: entries,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outdir: dir,
    outbase: '.',
    outExtension: { '.js': '.mjs' },
    plugins,
    logLevel: 'silent',
  });
  const module = (file) => import(pathToFileURL(path.resolve(dir, file)).href);
  return {
    pg,
    module,
    api: await module('app/api/study/route.mjs'),
    history: await module('app/api/history/route.mjs'),
    materials: await module('app/api/materials/route.mjs'),
    server: await module('lib/server.mjs'),
    model: await module('lib/model.mjs'),
  };
}
