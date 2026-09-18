import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {identity,respondError,AppError} from '@/lib/server';
import {verifyPdfOpenTicket} from '@/lib/pdf-open-ticket';

export async function GET(request:Request){
 try{
  const url=new URL(request.url),ticket=url.searchParams.get('openToken');
  if(ticket!==null){
   if(!await verifyPdfOpenTicket(ticket,{kind:'development-plan'}))throw new AppError('打开授权已失效，请回到学迹重新打开。',401);
  }else await identity();
  const pdf=await readFile(path.join(process.cwd(),'learning-plans','development-ver2.pdf'));
  return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':(url.searchParams.get('download')==='1'?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent('开发学习方案 ver2.pdf'),'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
 }catch(error){return respondError(error);}
}
