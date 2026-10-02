import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('work/tests',{recursive:true});
const tests=['core','flow','development','learning','curriculum','pdf-open','appearance'];
await build({entryPoints:tests.map(name=>'tests/'+name+'.test.ts'),bundle:true,platform:'node',format:'esm',packages:'external',alias:{'next/headers':'next/headers.js'},outdir:'work/tests',outExtension:{'.js':'.mjs'},logLevel:'silent'});
const result=spawnSync(process.execPath,['--test',...tests.map(name=>'work/tests/'+name+'.test.mjs')],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
