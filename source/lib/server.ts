import {db,atomicWrite,type SqlWrite} from './database';
import {files} from './storage';
import {hasSession} from './session';
import {readStoredState} from './data-protection';
import {APP_VERSION,DATA_VERSION,WRITE_PROTOCOL} from './versions';
export {db,files};
import { freshState, today, type StudyState, type Snapshot } from '@/lib/model';
export class AppError extends Error { constructor(message:string,public status=400){super(message);} }
export async function identity(){if(!await hasSession())throw new AppError('请先登录学习空间。',401);return {id:'owner',name:'我的学习空间'};}
export function checkOrigin(request:Request){
 const origin=request.headers.get('origin');if(!origin)return;
 // Next.js may use its internal listen address in request.url behind a proxy.
 // Host is supplied by the browser/platform and cannot be set by page scripts.
 const host=request.headers.get('host')??new URL(request.url).host;
 let source:URL;try{source=new URL(origin);}catch{throw new AppError('请求来源不匹配，请重新打开页面。',403);}
 const local=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
 if(source.host!==host||!(source.protocol==='https:'||(local&&source.protocol==='http:')))throw new AppError('请求来源不匹配，请重新打开页面。',403);
}
export async function loadState(userId:string):Promise<{state:StudyState;revision:number;updatedAt:string}>{
 await db().prepare('INSERT INTO study_profiles(user_id,data,revision) VALUES(?,?,0) ON CONFLICT(user_id) DO NOTHING').bind(userId,JSON.stringify(freshState())).run();
 const r=await db().prepare('SELECT data, revision,updated_at FROM study_profiles WHERE user_id=?').bind(userId).first<{data:string;revision:number;updated_at:string}>();
 if(!r)throw new AppError('学习空间暂时无法读取，请稍后重试。',503);
 return {state:readStoredState(r.data),revision:r.revision,updatedAt:r.updated_at};
}
export async function saveState(userId:string,state:StudyState,revision:number,options:{receiptId?:string;reason?:string;result?:Record<string,unknown>;extra?:SqlWrite[]}={}){
 if(JSON.stringify(state).length>750000)throw new AppError('学习记录较多，请先导出归档。');
 readStoredState(JSON.stringify(state));
 const writes:SqlWrite[]=[...(options.receiptId?[{query:'SELECT study_assert_receipt($1)',params:[options.receiptId]}]:[]),{query:"SELECT set_config('study.write_protocol',$1,true),set_config('study.change_reason',$2,true),set_config('study.app_version',$3,true)",params:[String(WRITE_PROTOCOL),options.reason??'保存学习内容',APP_VERSION]},
 {query:'SELECT study_save_profile($1,$2,$3)',params:[userId,JSON.stringify(state),revision]},...(options.extra??[])];
 if(options.receiptId)writes.push({query:"UPDATE study_receipts SET status='done',status_code=200,result=$1 WHERE id=$2",params:[JSON.stringify(options.result??{}),options.receiptId]});
 try{await atomicWrite(writes);}catch(error){
  if(error instanceof Error&&error.message.includes('STUDY_REVISION_CONFLICT')){
   if(options.receiptId)await db().prepare('INSERT INTO study_history(id,user_id,revision,data,reason,app_version,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(userId+':draft:'+options.receiptId,userId,revision,JSON.stringify(state),'未应用草稿：'+(options.reason??'保存学习内容'),APP_VERSION,new Date().toISOString()).run();
   throw new AppError('云端已有更新。本次修改未覆盖云端，草稿已保留；请比较后选择。',409);
  }throw error;
 }
}
export async function snapshot(userId:string,userName:string):Promise<Snapshot>{
 const base=await loadState(userId);const month=today().slice(0,7);
 const [key,usage]=await Promise.all([db().prepare('SELECT user_id FROM study_secrets WHERE user_id=?').bind(userId).first(),db().prepare("SELECT COALESCE(SUM(cost),0) AS cost, COUNT(*)::integer AS calls FROM study_ai_calls WHERE user_id=? AND month=?").bind(userId,month).first<{cost:number;calls:number}>()]);
 return {...base,hasKey:!!key,usage:{cost:usage?.cost??0,calls:usage?.calls??0,month},userName,appVersion:APP_VERSION,protocol:WRITE_PROTOCOL,schemaVersion:DATA_VERSION};
}
export function respondError(error:unknown){if(error instanceof AppError)return Response.json({error:error.message},{status:error.status});if(error instanceof Error&&/STUDY_UNSUPPORTED|STUDY_WRITE_PROTOCOL/.test(error.message))return Response.json({error:'软件与云端数据版本不兼容，已停止写入。请刷新到最新版本。'},{status:426});console.error('study_error',error instanceof Error?error.message:'unknown');return Response.json({error:'处理暂时失败，请稍后重试。你的已保存记录不会丢失。'},{status:500});}
export function log(state:StudyState,message:string,type:'plan'|'feedback'|'schedule'|'resource'){state.logs.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),message,type});state.logs=state.logs.slice(0,150);}
export function text(value:unknown,max=500){if(typeof value!=='string')throw new AppError('请检查文字输入。');return value.trim().slice(0,max);}
export function number(value:unknown,min:number,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new AppError('请输入有效范围内的数字。');return value;}
export function date(value:unknown){const d=text(value,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw new AppError('日期格式不正确。');return d;}
