import {loadState,db,AppError} from './server';
import {start,getRun} from 'workflow/api';
import {processMaterial} from '@/workflows/material';
import {type MaterialJob} from './pdf-processing';
export async function enqueueMaterial(userId:string,id:string){
const {state}=await loadState(userId);const m=state.materials.find(m=>m.id===id&&m.kind==='pdf');if(!m)throw new AppError('请选择已导入的 PDF。');
 let job=await db().prepare('SELECT * FROM study_material_jobs WHERE user_id=? AND material_id=?').bind(userId,id).first<MaterialJob>();
 if(job?.status==='complete'||job?.status==='conflict')return {status:job.status};
 if(job?.run_id&&job.status!=='paused'){const run=getRun(job.run_id);const status=await run.status;if(!['failed','cancelled','completed'].includes(status))return {status:job.status};}
 if(!job){const jobId=crypto.randomUUID();await db().prepare('INSERT INTO study_material_jobs(id,user_id,material_id,base_text_path) VALUES(?,?,?,?) ON CONFLICT(user_id,material_id) DO NOTHING').bind(jobId,userId,id,m.textPath??null).run();job=await db().prepare('SELECT * FROM study_material_jobs WHERE user_id=? AND material_id=?').bind(userId,id).first<MaterialJob>();}
 if(!job)throw new AppError('无法创建识别任务。');
 const claimed=await db().prepare("UPDATE study_material_jobs SET status='starting',updated_at=? WHERE id=? AND (status<>'starting' OR updated_at::timestamptz<now()-interval '2 minutes')").bind(new Date().toISOString(),job.id).run();if(!claimed.meta.changes)return {status:'starting'};
 try{const run=await start(processMaterial,[job.id]);await db().prepare('UPDATE study_material_jobs SET run_id=? WHERE id=?').bind(run.runId,job.id).run();return {status:'queued'};}catch(e){await db().prepare("UPDATE study_material_jobs SET status='paused',error='后台服务暂时未启动，请重试。' WHERE id=?").bind(job.id).run();throw e;}
}
