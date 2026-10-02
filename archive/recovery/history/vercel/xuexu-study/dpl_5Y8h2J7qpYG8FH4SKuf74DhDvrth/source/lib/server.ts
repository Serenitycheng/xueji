import {db} from './database';
import {files} from './storage';
import {hasSession} from './session';
export {db,files};
import { initialState, today, type StudyState, type Snapshot } from '@/lib/model';
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
export async function loadState(userId:string):Promise<{state:StudyState;revision:number}>{
 await db().prepare('INSERT INTO study_profiles(user_id,data,revision) VALUES(?,?,0) ON CONFLICT(user_id) DO NOTHING').bind(userId,JSON.stringify(initialState())).run();
 const r=await db().prepare('SELECT data, revision FROM study_profiles WHERE user_id=?').bind(userId).first<{data:string;revision:number}>();
 if(!r)throw new AppError('学习空间暂时无法读取，请稍后重试。',503);
 return {state:JSON.parse(r.data),revision:r.revision};
}
export async function saveState(userId:string,state:StudyState,revision:number){
 if(JSON.stringify(state).length>750000)throw new AppError('学习记录较多，请先导出归档。');
 const r=await db().prepare('UPDATE study_profiles SET data=?, revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(state),userId,revision).run();
 if(!r.meta.changes)throw new AppError('另一台设备刚刚更新了记录，已为你刷新，请重试。',409);
}
export async function snapshot(userId:string,userName:string):Promise<Snapshot>{
 const base=await loadState(userId);const month=today().slice(0,7);
 const [key,usage]=await Promise.all([db().prepare('SELECT user_id FROM study_secrets WHERE user_id=?').bind(userId).first(),db().prepare("SELECT COALESCE(SUM(cost),0) AS cost, COUNT(*)::integer AS calls FROM study_ai_calls WHERE user_id=? AND month=?").bind(userId,month).first<{cost:number;calls:number}>()]);
 return {...base,hasKey:!!key,usage:{cost:usage?.cost??0,calls:usage?.calls??0,month},userName};
}
export function respondError(error:unknown){if(error instanceof AppError)return Response.json({error:error.message},{status:error.status});console.error('study_error',error instanceof Error?error.message:'unknown');return Response.json({error:'处理暂时失败，请稍后重试。你的已保存记录不会丢失。'},{status:500});}
export function log(state:StudyState,message:string,type:'plan'|'feedback'|'schedule'|'resource'){state.logs.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),message,type});state.logs=state.logs.slice(0,150);}
export function text(value:unknown,max=500){if(typeof value!=='string')throw new AppError('请检查文字输入。');return value.trim().slice(0,max);}
export function number(value:unknown,min:number,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new AppError('请输入有效范围内的数字。');return value;}
export function date(value:unknown){const d=text(value,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw new AppError('日期格式不正确。');return d;}
