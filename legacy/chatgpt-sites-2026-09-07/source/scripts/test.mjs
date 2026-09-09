import {build} from 'esbuild';import {mkdir} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
await mkdir('work/tests',{recursive:true});
await build({entryPoints:['tests/core.test.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/tests/core.test.mjs',external:['pdfjs-dist','pdfjs-dist/build/pdf.worker.min.mjs?url'],logLevel:'silent'});
const result=spawnSync(process.execPath,['--test','work/tests/core.test.mjs'],{stdio:'inherit'});process.exit(result.status??1);
