import {loadState,db,AppError,files} from './server';
export async function enqueueMaterial(userId:string,id:string){
 const {state}=await loadState(userId);const material=state.materials.find(m=>m.id===id&&!m.url);if(!material)throw new AppError('请选择已上传的资料。');
 await db().prepare("INSERT INTO study_material_jobs(id,user_id,material_id,base_text_path,status) VALUES(?,?,?,?,'awaiting-device') ON CONFLICT(user_id,material_id) DO UPDATE SET status=CASE WHEN study_material_jobs.status='paused' THEN 'awaiting-device' ELSE study_material_jobs.status END").bind(crypto.randomUUID(),userId,id,material.textPath??null).run();
 await files().put(userId+'/device-queue-signal',crypto.randomUUID());
 const row=await db().prepare('SELECT status FROM study_material_jobs WHERE user_id=? AND material_id=?').bind(userId,id).first<{status:string}>();return {status:row?.status??'awaiting-device'};
}
