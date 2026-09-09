import {createHash} from 'node:crypto';
import {checkOrigin,db,respondError,AppError} from '@/lib/server';
import {verifyPassword,issueSession,clearSession} from '@/lib/session';
export async function POST(request:Request){try{
 checkOrigin(request);if(Number(request.headers.get('content-length')??0)>2048)throw new AppError('输入过长。');
 const input=await request.json();if(typeof input.password!=='string'||input.password.length>256)throw new AppError('请输入访问密码。');
 if(!process.env.STUDY_PASSWORD_HASH)throw new AppError('个人登录尚未配置，请完成本机设置。',503);
 const ip=request.headers.get('x-vercel-forwarded-for')??'local';
 const bucket=createHash('sha256').update(ip+':'+Math.floor(Date.now()/900000)).digest('hex');
 const attempt=await db().prepare('INSERT INTO study_login_attempts(id,attempts,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=study_login_attempts.attempts+1 RETURNING attempts').bind(bucket,Date.now()+900000).first<{attempts:number}>();
 if(!attempt||attempt.attempts>10)throw new AppError('尝试次数较多，请15分钟后再试。',429);
 if(!await verifyPassword(input.password))throw new AppError('访问密码不正确。',401);
 await issueSession();await db().prepare('DELETE FROM study_login_attempts WHERE expires<?').bind(Date.now()).run();
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return respondError(error);}}
export async function DELETE(request:Request){try{checkOrigin(request);await clearSession();return Response.json({ok:true});}catch(error){return respondError(error);}}
