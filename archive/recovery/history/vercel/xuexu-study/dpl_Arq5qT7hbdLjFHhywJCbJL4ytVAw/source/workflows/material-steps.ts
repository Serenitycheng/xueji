import {preparePdf,recognizePdf,publishPdf,setJob} from '@/lib/pdf-processing';
export async function prepare(id:string){
 'use step';
 return preparePdf(id);
}
export async function recognize(id:string,pages:number[]){
 'use step';
 try{await recognizePdf(id,pages);return false;}catch(e){if((e as {status?:number})?.status===429)return true;throw e;}
}
recognize.maxRetries=0;
export async function publish(id:string,complete:boolean){
 'use step';
 await publishPdf(id,complete);
}
export async function failed(id:string,error:string){
 'use step';
 await setJob(id,'paused',error.slice(0,500));
}
