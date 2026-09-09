import {identity,checkOrigin,respondError,db,AppError,loadState,files,number,text} from '@/lib/server';
import {enqueueMaterial} from '@/lib/material-jobs';
export async function GET(request:Request){try{
 const user=await identity(),url=new URL(request.url);
 if(url.searchParams.get('signal')==='1'){const file=await files().get(user.id+'/device-queue-signal');return Response.json({signal:file?await file.text():''},{headers:{'Cache-Control':'no-store'}});}
 if(url.searchParams.get('text')==='1'){
  const {state}=await loadState(user.id),m=state.materials.find(m=>m.id===url.searchParams.get('id'));
  const file=m?.textPath?await files().get(m.textPath):null;
  if(!file)throw new AppError('尚未生成识别文字。',404);
  return new Response(file.body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'private, no-store'}});
 }
 const row=await db().prepare("SELECT COALESCE(json_agg(json_build_object('id',id,'materialId',material_id,'status',status,'pages',pages,'done',done,'error',error,'updatedAt',updated_at)),'[]'::json) AS jobs FROM study_material_jobs WHERE user_id=?").bind(user.id).first();
 return Response.json(row,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return respondError(e);}}
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity(),input=await request.json(),id=text(input.id,200);
 if(input.action==='claim'){
  const {state}=await loadState(user.id),m=state.materials.find(m=>m.id===id&&!m.url);
  if(!m)throw new AppError('原资料已不存在。',404);
  const runId=crypto.randomUUID(),now=new Date().toISOString(),stale=new Date(Date.now()-10*60*1000).toISOString();
  const job=await db().prepare("UPDATE study_material_jobs SET status='device-processing',run_id=?,error=NULL,base_text_path=?,updated_at=? WHERE user_id=? AND material_id=? AND (status='awaiting-device' OR (status='device-processing' AND updated_at<?)) RETURNING id").bind(runId,m.textPath??null,now,user.id,id,stale).first();
  if(!job)throw new AppError('任务已由另一台电脑领取或已经完成。',409);
  return Response.json({runId,material:m,baseTextPath:m.textPath??null});
 }
 if(input.action==='progress'){
  const runId=text(input.runId,100),status=['device-processing','paused','conflict'].includes(input.status)?input.status:'device-processing';
  const pages=number(input.pages??0,0,5000),done=number(input.done??0,0,pages);
  const result=await db().prepare("UPDATE study_material_jobs SET status=?,pages=?,done=?,error=?,updated_at=? WHERE user_id=? AND material_id=? AND run_id=? AND status='device-processing' RETURNING id").bind(status,pages,done,input.error?text(input.error,500):null,new Date().toISOString(),user.id,id,runId).first();
  if(!result)throw new AppError('任务处理权已变更，请重新读取队列。',409);
  return Response.json({ok:true});
 }
 return Response.json(await enqueueMaterial(user.id,id));
 }catch(e){return respondError(e);}}
