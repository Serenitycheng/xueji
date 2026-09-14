import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {SignJWT} from 'jose';
import {ProxyAgent,setGlobalDispatcher} from 'undici';
import {extractPdf,fullText} from './local-extract.mjs';
import {analyze,codexBinary} from './codex-analysis.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
for(const f of ['.env.local','.env.development.local','.env.device.local'])if(fs.existsSync(f))process.loadEnvFile(f);
if(process.env.STUDY_HTTPS_PROXY)setGlobalDispatcher(new ProxyAgent(process.env.STUDY_HTTPS_PROXY));
const base=process.env.STUDY_SITE_URL||'https://xuexu-study.vercel.app';
const origin=new URL(base);if(origin.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(origin.hostname))throw new Error('处理器只连接 HTTPS 网站。');
const cache=path.resolve('work/device');fs.mkdirSync(cache,{recursive:true});
let token='',expires=0;
export async function api(route,body,binary=false){
 if(Date.now()>expires){token=await new SignJWT({version:createHash('sha256').update(process.env.STUDY_PASSWORD_HASH).digest('hex')}).setProtectedHeader({alg:'HS256'}).setSubject('owner').setIssuer('studyflow').setAudience('studyflow').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));expires=Date.now()+50*60*1000;}
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{Cookie:'__Host-study-session='+token,...(body?{'Content-Type':'application/json',Origin:base}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(180000)});
   if(binary&&r.ok)return new Uint8Array(await r.arrayBuffer());
   const data=await r.json();if(!r.ok){const error=new Error(data.error||'连接网站失败');error.status=r.status;throw error;}if(r.status===202)throw new Error('上次保存仍在确认，结果已留在电脑；请稍后继续。');return data;
  }catch(e){if(e.status||attempt===2)throw e;await new Promise(r=>setTimeout(r,1500*(attempt+1)));}
 }
}
export async function publish(claim,pages,analysis){
 const content=fullText(pages);if(content.length>800000)throw new Error('文字超过 80 万字符，已保存在电脑，请按章节拆分。');
 for(let n=0;n<3;n++){
  const s=await api('/api/study'),m=s.state.materials.find(m=>m.id===claim.material.id);
  if(!m||(m.textPath??null)!==claim.baseTextPath){if(m?.analysis&&m.textLength===content.length)return s;const e=new Error('正文已更新，处理结果保留在电脑，没有覆盖你的修改。');e.status=409;throw e;}
  try{return await api('/api/study',{op:'material.processed',protocol:s.protocol,revision:s.revision,requestId:randomUUID(),id:m.id,runId:claim.runId,baseTextPath:claim.baseTextPath,pages:pages.length,content,analysis});}catch(e){if(e.status!==409||n===2)throw e;}
 }
}
async function processJob(job){
 const claim=await api('/api/material-jobs',{id:job.materialId,action:'claim'}),m=claim.material;
 if(!/^[a-f0-9-]{36}$/.test(m.id))throw new Error('资料编号无效。');
 const folder=path.join(cache,m.id);fs.mkdirSync(folder,{recursive:true});
 let progress={done:0,pages:0},heartbeatError=null,stopped=false;
 const pulse=()=>api('/api/material-jobs',{id:m.id,action:'progress',runId:claim.runId,...progress}).catch(e=>{heartbeatError=e;});
 const heartbeat=setInterval(()=>{if(!stopped)void pulse();},30000);
 try{
  console.log(new Date().toISOString()+' Processing '+m.name);
  let pages;
  if(m.kind==='pdf'&&m.textPath){
   const saved=await api('/api/materials?id='+encodeURIComponent(m.id)+'&text=1'),parts=saved.text.split(/(?=\[PDF第\d+页\])/).filter(x=>x.trim());
   pages=parts.map(chunk=>{const match=chunk.match(/^\[PDF第(\d+)页\]([^\n]*)\n([\s\S]*)$/);if(!match)throw new Error('已保留手动修改的正文；缺少逐页标记，无法自动核对页码。');return {page:Number(match[1]),text:match[3],method:match[2].includes('识别')?'local-ocr':'text'};});
   if(pages.length!==m.pages||pages.some((p,i)=>p.page!==i+1))throw new Error('手动正文页码不完整，未覆盖保存的文字；请保留每页标记后继续整理。');
  }else if(m.kind==='pdf'){
   const file=path.join(folder,'original.pdf');if(!fs.existsSync(file))fs.writeFileSync(file,await api('/api/materials?id='+encodeURIComponent(m.id),null,true));
   pages=await extractPdf(file,folder,(done,total)=>{progress={done:Math.min(done,total),pages:total};});
  }else{
   const result=m.textPath?await api('/api/materials?id='+encodeURIComponent(m.id)+'&text=1'):null;
   if(!result?.text?.trim())throw new Error('该文件未提取到文字，请另存为 PDF 后导入。');
   const chunks=result.text.split(/(?=\[第\d+(?:张幻灯片|部分)\])/).filter(x=>x.trim());
   pages=chunks.map((text,i)=>({page:i+1,text,method:'text',unit:'section'}));
  }
  progress={done:pages.length,pages:pages.length};await pulse();
  fs.writeFileSync(path.join(folder,'full-text.txt'),fullText(pages));
  if(fullText(pages).length>800000)throw new Error('文字超过 80 万字符，已保存在电脑，请按章节拆分后整理。');
  if(heartbeatError?.status===409)throw heartbeatError;
  const analysis=await analyze(pages,m,folder);
  if(heartbeatError?.status===409)throw heartbeatError;
  await publish(claim,pages,analysis);
  console.log(new Date().toISOString()+' Saved '+m.name+' ('+pages.length+' pages)');
 }catch(e){
  await api('/api/material-jobs',{id:m.id,action:'progress',runId:claim.runId,status:e.status===409?'conflict':'paused',error:e.message.slice(0,450),...progress}).catch(()=>{});
  throw e;
 }finally{stopped=true;clearInterval(heartbeat);}
}
async function main(){
 const login=spawnSync(codexBinary(),['login','status'],{encoding:'utf8',windowsHide:true});
 if(login.status!==0||!/ChatGPT/i.test(login.stdout+login.stderr))throw new Error('请先在本机 Codex 登录 ChatGPT 账号，处理器不会使用 API Key 计费。');
 const snap=await api('/api/study');if(snap.protocol!==4)throw new Error('本机处理器与网站版本不一致，请更新后再处理资料。');
 if(process.argv.includes('--check')){console.log('ChatGPT subscription login and website connection verified.');return;}
 const lock=path.join(cache,'worker.lock');
 if(fs.existsSync(lock)){const pid=Number(fs.readFileSync(lock,'utf8'));if(Number.isInteger(pid)&&pid>0){let alive=true;try{process.kill(pid,0);}catch(e){alive=e.code!=='ESRCH';}if(alive){console.log('A processor is already running.');return;}}fs.unlinkSync(lock);}
 fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
 const release=()=>{try{if(fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock);}catch{}};
 process.on('exit',release);process.on('SIGINT',()=>process.exit(0));process.on('SIGTERM',()=>process.exit(0));
 let previousSignal=null,lastFullCheck=0;
 do{
  try{
   const signal=await api('/api/material-jobs?signal=1');
   if(signal.signal!==previousSignal||Date.now()-lastFullCheck>15*60*1000){
    const {jobs}=await api('/api/material-jobs');lastFullCheck=Date.now();previousSignal=signal.signal;
    for(const job of jobs.filter(j=>j.status==='awaiting-device'||j.status==='device-processing'&&Date.now()-Date.parse(j.updatedAt)>10*60*1000)){
     try{await processJob(job);}catch(e){console.error(new Date().toISOString()+' '+e.message);}
    }
   }
  }catch(e){console.error(new Date().toISOString()+' '+e.message);}
  if(process.argv.includes('--once')){release();return;}
  await new Promise(r=>setTimeout(r,60000));
 }while(true);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
