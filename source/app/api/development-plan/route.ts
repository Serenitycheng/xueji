import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {identity,respondError} from '@/lib/server';

export async function GET(){
 try{
  await identity();
  const pdf=await readFile(path.join(process.cwd(),'learning-plans','development-ver2.pdf'));
  return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent('开发学习方案 ver2.pdf'),'Cache-Control':'private, no-store'}});
 }catch(error){return respondError(error);}
}
