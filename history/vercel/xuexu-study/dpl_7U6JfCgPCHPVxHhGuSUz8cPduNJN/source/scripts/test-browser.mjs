import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {SignJWT} from 'jose';
import {pathToFileURL} from 'node:url';
process.loadEnvFile('.env.local');process.loadEnvFile('.env.development.local');
const {chromium}=await import(process.env.STUDY_PLAYWRIGHT?pathToFileURL(process.env.STUDY_PLAYWRIGHT).href:'playwright');
await build({entryPoints:['lib/model.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/tests/browser-model.mjs',logLevel:'silent'});
const {initialState}=await import('../work/tests/browser-model.mjs');
const token=await new SignJWT({version:createHash('sha256').update(process.env.STUDY_PASSWORD_HASH).digest('hex')}).setProtectedHeader({alg:'HS256'}).setSubject('owner').setIssuer('studyflow').setAudience('studyflow').setExpirationTime('10m').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1365,height:900},extraHTTPHeaders:{Cookie:'__Host-study-session='+token}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
let snap={state:initialState(),revision:1,hasKey:true,usage:{cost:0,calls:0,month:'2026-09'},userName:'测试空间',appVersion:'0.2.0',protocol:2,schemaVersion:1,updatedAt:new Date().toISOString()};
const submitted=[],receipts=new Map();let dropAcknowledgement=false;
// All data APIs are intercepted. Browser scenarios never modify the real owner.
await context.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(url.pathname==='/api/study'&&req.method()==='GET')return json(snap);
 if(url.pathname==='/api/study'&&req.method()==='POST'){
  const c=req.postDataJSON();submitted.push(c);assert.equal(c.protocol,2);assert.match(c.requestId,/^[a-f0-9-]{36}$/);
  if(receipts.has(c.requestId))return json({snapshot:snap,message:'已保存',replayed:true});
  if(c.revision!==snap.revision)return json({error:'云端已有更新，本机草稿已保留。'},409);
  if(c.op==='settings.save')snap={...snap,state:{...snap.state,settings:c.settings},revision:snap.revision+1};
  else throw new Error('Unexpected browser test mutation '+c.op);
  receipts.set(c.requestId,true);
  if(dropAcknowledgement){dropAcknowledgement=false;return route.abort('connectionreset');}
  return json({snapshot:snap,message:'已保存'});
 }
 if(url.pathname==='/api/history')return json({items:[],nextOffset:null});
 return json({error:'No live API allowed in browser fixtures'},400);
});
const drafts=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('studyflow-local-v2',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('records'),q=tx.objectStore('records').getAll();q.onsuccess=()=>{resolve(q.result.filter(v=>v.command));db.close();};};r.onerror=()=>reject(r.error);}));
try{
 await page.goto('http://127.0.0.1:4173/#settings');await page.getByLabel('每月人民币预算').waitFor();await page.waitForFunction(()=>document.body.innerText.includes('共 0 次请求'));await page.waitForTimeout(800);
 await page.getByLabel('每月人民币预算').fill('99');snap={...snap,revision:2,state:{...snap.state,settings:{...snap.state.settings,budget:88}}};
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('另一台设备有新内容，当前编辑保持原样。').waitFor();assert.equal(await page.getByLabel('每月人民币预算').inputValue(),'99');
 await page.getByRole('button',{name:'保存设置',exact:true}).click();await page.getByText('云端已有更新，本机草稿已保留。').waitFor();assert.equal((await drafts())[0].status,'conflict');console.log('PASS: remote updates preserve editing; stale save becomes a durable conflict');
 await page.getByRole('button',{name:'同步与版本',exact:true}).click();await page.getByRole('button',{name:'比较与处理',exact:true}).click();await page.getByRole('button',{name:'确认保存我的修改',exact:true}).click();await page.waitForFunction(()=>!document.body.innerText.includes('本机待处理草稿 ·'));assert.equal(snap.state.settings.budget,99);assert.equal(snap.revision,3);assert.notEqual(submitted[0].requestId,submitted[1].requestId);console.log('PASS: explicit comparison resubmits against the reviewed revision');
 await page.getByRole('button',{name:'偏好与 AI 设置',exact:true}).click();await page.getByLabel('每月人民币预算').fill('77');await context.setOffline(true);await page.getByRole('button',{name:'保存设置',exact:true}).click();await page.getByText('保存尚未确认，本机草稿已保留。可在“同步与版本”中查看。').waitFor();const offline=await drafts();assert.equal(offline[0].command.settings.budget,77);const id=offline[0].command.requestId;console.log('PASS: offline save is persisted before any network request');
 dropAcknowledgement=true;await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(1300);await page.reload();await page.getByRole('button',{name:'同步与版本',exact:true}).click();await page.getByRole('button',{name:'查询保存结果',exact:true}).click();await page.waitForTimeout(1000);assert.equal((await drafts()).length,0);assert.equal(snap.revision,4);assert.ok(submitted.filter(c=>c.requestId===id).length>=2);console.log('PASS: lost response and reload reuse one receipt, with exactly one revision increase');
 await page.screenshot({path:'work/tests/cloud-desktop.png',fullPage:true});assert.equal(await page.locator('.cloud-grid').evaluate(el=>getComputedStyle(el).display),'grid');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/tests/cloud-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile layout and browser runtime');
 await page.setViewportSize({width:1365,height:900});await page.getByRole('button',{name:'资料库',exact:true}).click();await page.getByRole('button',{name:'导入文件',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'large-textbook.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(31*1024*1024)});assert.equal(await page.getByRole('checkbox',{name:'同时提取参考文字'}).isChecked(),false);await page.getByText('每份最多 200MB',{exact:false}).waitFor();
 await page.locator('input[type=file]').setInputFiles({name:'small-textbook.txt',mimeType:'text/plain',buffer:Buffer.from('intro')});assert.equal(await page.getByRole('checkbox',{name:'同时提取参考文字'}).isChecked(),true);console.log('PASS: large files are selectable; text extraction is independently controlled');
}finally{await browser.close();}
