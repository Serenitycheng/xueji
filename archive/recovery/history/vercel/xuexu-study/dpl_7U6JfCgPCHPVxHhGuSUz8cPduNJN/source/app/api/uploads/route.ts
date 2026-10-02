import {WRITE_PROTOCOL} from '@/lib/versions';
import {MAX_UPLOAD_BYTES} from '@/lib/material-upload';
import {handleUpload,type HandleUploadBody} from '@vercel/blob/client';
import {identity,loadState,checkOrigin,respondError,AppError} from '@/lib/server';
export async function POST(request:Request){try{
 if(Number(request.headers.get('content-length')??0)>10000)throw new AppError('请求过大。');
 const body=await request.json() as HandleUploadBody;
 const response=await handleUpload({body,request,
  onBeforeGenerateToken:async (pathname,clientPayload)=>{
   checkOrigin(request);const user=await identity();if(JSON.parse(clientPayload??'{}').protocol!==WRITE_PROTOCOL)throw new AppError('页面已更新，请刷新后再上传。',426);
   const match=pathname.match(/^owner\/([0-9a-f-]{36})\/file$/);
   if(!match)throw new AppError('上传路径无效。');
   const {state}=await loadState(user.id);if(state.materials.some(m=>m.id===match[1]))throw new AppError('资料已存在，请重新选择文件。');
   return {maximumSizeInBytes:MAX_UPLOAD_BYTES,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+30*60*1000,tokenPayload:JSON.stringify({userId:user.id})};
  },
 });return Response.json(response);
 }catch(error){return respondError(error);}}
