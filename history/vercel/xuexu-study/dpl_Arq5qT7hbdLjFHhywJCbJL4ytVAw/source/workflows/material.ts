import {sleep} from 'workflow';
import {prepare,recognize,publish,failed} from './material-steps';
export async function processMaterial(id:string){
 'use workflow';
 try{
  const pages=await prepare(id);
  if(pages.length)await publish(id,false);
  for(let i=0;i<pages.length;i+=8){
   let busy=true;while(busy){busy=await recognize(id,pages.slice(i,i+8));if(busy)await sleep('30s');}
   if(i===0)await publish(id,false);
  }
  await publish(id,true);
 }catch(error){await failed(id,error instanceof Error?error.message:'教材识别暂停，请重试。');}
}
