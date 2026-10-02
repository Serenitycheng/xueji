import {get,put,del} from '@vercel/blob';
export function files(){return {
 async get(path:string){
  const result=await get(path,{access:'private',useCache:false});
  if(!result||result.statusCode!==200)return null;
  return {body:result.stream,httpMetadata:{contentType:result.blob.contentType},text:()=>new Response(result.stream).text()};
 },
 async put(path:string,body:string|ReadableStream,options?:{httpMetadata?:{contentType?:string}}){
  return put(path,body,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:options?.httpMetadata?.contentType??'text/plain; charset=utf-8'});
 },
 async delete(paths:string|string[]){await del(paths);}
};}
