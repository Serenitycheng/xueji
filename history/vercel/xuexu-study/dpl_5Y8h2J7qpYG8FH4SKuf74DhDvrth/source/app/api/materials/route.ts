import {head} from '@vercel/blob';
import {identity,files,loadState,saveState,respondError,checkOrigin,AppError,log,snapshot} from '@/lib/server';
import {contentTypes,uploadMetadata} from '@/lib/material-upload';
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity();if(Number(request.headers.get('content-length')??0)>3500000)throw new AppError('资料文字过长，请按章节拆分。');
 const input=await request.json();let metadata;try{metadata=uploadMetadata(input);}catch(e){throw new AppError(e instanceof Error?e.message:'上传信息无效。');}
 const {id,name,ext,size,text:extracted,pages}=metadata;
 const {state,revision}=await loadState(user.id);if(state.materials.some(m=>m.id===id))return Response.json({snapshot:await snapshot(user.id,user.name),message:'资料已保存。'});
 if(input.revision!==revision)throw new AppError('记录已更新，请刷新后再次导入。',409);
 if(!state.subjects.some(s=>s.id===input.subjectId)&&input.subjectId!=='general')throw new AppError('请选择资料所属学科。');
 const prefix=user.id+'/'+id;const blob=await head(prefix+'/file');if(blob.size!==size)throw new AppError('上传未完成，请重新导入。');
 if(extracted)await files().put(prefix+'/text',extracted);
 state.materials.push({id,subjectId:input.subjectId,name,kind:ext==='pdf'?'pdf':ext==='pptx'?'slides':'text',size,pages,textLength:extracted.length,status:extracted.trim().length>30?'ready':'needs-text',excerpt:extracted.slice(0,600),createdAt:new Date().toISOString()});
 log(state,'导入资料：'+name,'resource');await saveState(user.id,state,revision);
 return Response.json({snapshot:await snapshot(user.id,user.name),message:extracted.trim().length>30?'资料已保存，文字已提取。':'文件已保存；未提取到足够文字，可在资料详情中补充目录。'});
 }catch(error){return respondError(error);}}
export async function GET(request:Request){try{
 const user=await identity(),url=new URL(request.url),id=url.searchParams.get('id');const {state}=await loadState(user.id);const m=state.materials.find(m=>m.id===id);if(!m)throw new AppError('找不到这份资料。',404);
 const isText=url.searchParams.get('text')==='1';const file=await files().get(user.id+'/'+id+(isText?'/text':'/file'));if(!file)throw new AppError('没有可读取的内容。',404);
 if(isText)return Response.json({text:await file.text()},{headers:{'Cache-Control':'no-store'}});
 const name=encodeURIComponent(m.name);const ext=m.name.split('.').pop()?.toLowerCase()??'';return new Response(file.body,{headers:{'Content-Type':contentTypes[ext]??'application/octet-stream','Content-Disposition':"inline; filename*=UTF-8''"+name,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 }catch(error){return respondError(error);}}
