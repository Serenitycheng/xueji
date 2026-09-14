import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const production=process.env.VERCEL_ENV==='production';
if(production){
 const required=['DATABASE_URL','BLOB_READ_WRITE_TOKEN','SESSION_SECRET','STUDY_PASSWORD_HASH','STUDY_ENCRYPTION_KEY'];
 const missing=required.filter(key=>!process.env[key]);
 if(missing.length)throw new Error('Missing production configuration: '+missing.join(', '));
}
function run(file,args=[]){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[file,...args],{stdio:'inherit',env:process.env});
  child.on('error',reject);
  child.on('exit',code=>code===0?resolve():reject(new Error('Release step failed: '+file+' (exit '+code+')')));
 });
}
await run('scripts/prepare-assets.mjs');
await run(require.resolve('next/dist/bin/next'),['build']);
if(production){
 console.log('Production build passed; applying pending forward database migrations.');
 await run('scripts/migrate.mjs');
 console.log('Production database migrations completed.');
}else{
 console.log('Preview/local build: database migrations skipped.');
}
