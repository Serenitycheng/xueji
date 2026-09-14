import {createHash} from 'node:crypto';
import {db,AppError,snapshot,respondError} from './server';
import {compatibleWrite} from './data-protection';
export async function claimCommand(user:{id:string;name:string},input:Record<string,unknown>){
 if(typeof input.requestId!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(input.requestId))throw new AppError('缺少有效保存编号，请刷新页面。');
 const id=user.id+':'+input.requestId;
 const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 // Older drafts may query an existing receipt, but cannot start another write.
 // This keeps a lost pre-upgrade response from repeating an AI call or save.
 const currentProtocol=compatibleWrite(input.protocol);
 if(currentProtocol){
  const inserted=await db().prepare("INSERT INTO study_receipts(id,user_id,fingerprint,status,created_at) VALUES(?,?,?,'processing',?) ON CONFLICT(id) DO NOTHING").bind(id,user.id,fingerprint,Date.now()).run();
  if(inserted.meta.changes)return {id};
 }
 const previous=await db().prepare('SELECT fingerprint,status,status_code,result,created_at FROM study_receipts WHERE id=? AND user_id=?').bind(id,user.id).first<{fingerprint:string;status:string;status_code:number;result:string|null;created_at:number}>();
 if(!previous&&!currentProtocol)throw new AppError('页面版本已更新。请比较保留的草稿后再保存，旧页面不会覆盖云端内容。',426);
 if(!previous||previous.fingerprint!==fingerprint)throw new AppError('保存编号与内容不一致，本次修改没有写入。',409);
 if(previous.status==='done')return {response:Response.json({...JSON.parse(previous.result??'{}'),snapshot:await snapshot(user.id,user.name),replayed:true})};
 if(previous.status==='failed')return {response:Response.json(JSON.parse(previous.result??'{}'),{status:previous.status_code})};
 return {response:Response.json({pending:true,error:Date.now()-Number(previous.created_at)>240000?'上次保存未能确认完成。草稿仍保留，请核对云端后再决定。':'上次请求仍在处理中，草稿已保留，请稍后重试。',uncertain:Date.now()-Number(previous.created_at)>240000},{status:202})};
}
export async function commandError(id:string|undefined,error:unknown){
 const response=respondError(error);
 // A transport/server failure can happen after commit. Keep its receipt retryable,
 // so a lost acknowledgement never repeats an AI call or a successful mutation.
 if(id&&response.status<500){const payload=await response.clone().text();await db().prepare("UPDATE study_receipts SET status='failed',status_code=?,result=? WHERE id=? AND status='processing'").bind(response.status,payload,id).run().catch(()=>{});}
 return response;
}
