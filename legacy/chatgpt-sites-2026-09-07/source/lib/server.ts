import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { headers } from 'next/headers';
import { initialState, today, type StudyState, type Snapshot } from '@/lib/model';
export class AppError extends Error { constructor(message:string,public status=400){super(message);} }
export function db(){return env.DB;}
export function files(){return env.FILES;}
export async function identity(){
 const u=await getChatGPTUser();
 const requestHeaders=await headers();
 // Sites can forward a verified email without a user-id in the private-site renderer.
 // Use the same canonical key on both variants so desktop and mobile share records.
 const email=(u?.email??requestHeaders.get('oai-authenticated-user-email'))?.trim().toLowerCase();
 if(email){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email));const id='account-'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');return {id,name:u?.fullName??'我的学习空间'};}
 if(import.meta.env.DEV)return {id:'local-development',name:'我的学习空间'};
 throw new AppError('请先登录后再打开学习空间。',401);
}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AppError('请求来源不匹配，请重新打开页面。',403);}
export async function loadState(userId:string):Promise<{state:StudyState;revision:number}>{
 await db().prepare('INSERT OR IGNORE INTO study_profiles(user_id,data,revision) VALUES(?,?,0)').bind(userId,JSON.stringify(initialState())).run();
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
 const [key,usage]=await Promise.all([db().prepare('SELECT user_id FROM study_secrets WHERE user_id=?').bind(userId).first(),db().prepare("SELECT COALESCE(SUM(cost),0) AS cost, COUNT(*) AS calls FROM study_ai_calls WHERE user_id=? AND month=?").bind(userId,month).first<{cost:number;calls:number}>()]);
 return {...base,hasKey:!!key,usage:{cost:usage?.cost??0,calls:usage?.calls??0,month},userName};
}
export function respondError(error:unknown){if(error instanceof AppError)return Response.json({error:error.message},{status:error.status});console.error('study_error',error instanceof Error?error.message:'unknown');return Response.json({error:'处理暂时失败，请稍后重试。你的已保存记录不会丢失。'},{status:500});}
export function log(state:StudyState,message:string,type:'plan'|'feedback'|'schedule'|'resource'){state.logs.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),message,type});state.logs=state.logs.slice(0,150);}
export function text(value:unknown,max=500){if(typeof value!=='string')throw new AppError('请检查文字输入。');return value.trim().slice(0,max);}
export function number(value:unknown,min:number,max:number){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new AppError('请输入有效范围内的数字。');return value;}
export function date(value:unknown){const d=text(value,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw new AppError('日期格式不正确。');return d;}
