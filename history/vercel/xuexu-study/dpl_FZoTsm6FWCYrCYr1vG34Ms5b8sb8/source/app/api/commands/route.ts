import {identity,db,checkOrigin,AppError,respondError} from '@/lib/server';
import {WRITE_PROTOCOL} from '@/lib/versions';
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity();const input=await request.json();
 if(input.protocol!==WRITE_PROTOCOL||typeof input.requestId!=='string'||!/^[0-9a-f-]{36}$/.test(input.requestId))throw new AppError('请求信息无效。');
 const result=await db().prepare("UPDATE study_receipts SET status='failed',status_code=410,result=? WHERE id=? AND user_id=? AND status='processing' AND created_at<?").bind(JSON.stringify({error:'已停止未确认的请求，后到的结果也不会写入。草稿可以导出或放弃。'}),user.id+':'+input.requestId,user.id,Date.now()-240000).run();
 if(!result.meta.changes)throw new AppError('请求尚未超时，或已经处理完成。请先查询保存结果。');
 return Response.json({message:'已停止请求'});
 }catch(error){return respondError(error);}}
