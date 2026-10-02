import {identity,db,respondError,AppError,snapshot} from '@/lib/server';
import {contentSummary,readStoredState} from '@/lib/data-protection';
import {APP_VERSION,DATA_VERSION} from '@/lib/versions';
export async function GET(request:Request){try{
 const user=await identity();const url=new URL(request.url);const id=url.searchParams.get('id');
 if(id){const row=await db().prepare('SELECT id,revision,data,reason,app_version,created_at FROM study_history WHERE id=? AND user_id=?').bind(id,user.id).first<any>();if(!row)throw new AppError('这个历史版本不存在。',404);const state=readStoredState(row.data);return Response.json({id:row.id,revision:row.revision,reason:row.reason,createdAt:row.created_at,appVersion:row.app_version,summary:contentSummary(state),state},{headers:{'Cache-Control':'no-store'}});}
 if(url.searchParams.get('export')==='1'){const current=await snapshot(user.id,user.name);return Response.json({format:'studyflow-backup',schemaVersion:DATA_VERSION,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),revision:current.revision,state:current.state},{headers:{'Cache-Control':'no-store','Content-Disposition':'attachment; filename="studyflow-content-backup.json"'}});}
 const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
 const rows=await db().prepare('SELECT COALESCE(json_agg(r),\'[]\'::json) AS items FROM (SELECT id,revision,reason,app_version AS "appVersion",created_at AS "createdAt" FROM study_history WHERE user_id=? ORDER BY created_at::timestamptz DESC,id DESC LIMIT 21 OFFSET ?) r').bind(user.id,offset).first<{items:any[]}>();
 return Response.json({items:(rows?.items??[]).slice(0,20),nextOffset:(rows?.items.length??0)>20?offset+20:null},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return respondError(error);}}
