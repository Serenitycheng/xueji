import {identity,files,loadState,saveState,respondError,checkOrigin,AppError,log,snapshot} from '@/lib/server';
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity();if(Number(request.headers.get('content-length')??0)>23000000)throw new AppError('单份资料请控制在20MB以内。');
 const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||!file.size||file.size>20*1024*1024)throw new AppError('请选择20MB以内的有效文件。');
 const subjectId=String(form.get('subjectId'));const {state,revision}=await loadState(user.id);
 if(Number(form.get('revision'))!==revision)throw new AppError('记录已更新，请刷新后再次导入。',409);
 if(!state.subjects.some(s=>s.id===subjectId)&&subjectId!=='general')throw new AppError('请选择资料所属学科。');
 const extension=file.name.split('.').pop()?.toLowerCase();if(!['pdf','pptx','docx','txt','md'].includes(extension??''))throw new AppError('支持 PDF、PPTX、DOCX、TXT 和 Markdown 文件。');
 const extracted=String(form.get('text')??'').slice(0,800000);const id=crypto.randomUUID();const prefix=user.id+'/'+id;
 const mime:Record<string,string>={pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain; charset=utf-8',md:'text/plain; charset=utf-8'};
 await files().put(prefix+'/file',file.stream(),{httpMetadata:{contentType:mime[extension!]}});
 try{if(extracted)await files().put(prefix+'/text',extracted);
 state.materials.push({id,subjectId:subjectId as any,name:file.name.slice(0,200),kind:extension==='pdf'?'pdf':extension==='pptx'?'slides':'text',size:file.size,pages:Math.max(0,Math.min(5000,Number(form.get('pages'))||0)),textLength:extracted.length,status:extracted.trim().length>30?'ready':'needs-text',excerpt:extracted.slice(0,600),createdAt:new Date().toISOString()});
 log(state,'导入资料：'+file.name.slice(0,200),'resource');await saveState(user.id,state,revision);
 }catch(e){await files().delete([prefix+'/file',prefix+'/text']);throw e;}
 return Response.json({snapshot:await snapshot(user.id,user.name),message:extracted.trim().length>30?'资料已保存，文字已提取。':'文件已保存；未提取到足够文字，可在资料详情中补充目录。'});
 }catch(error){return respondError(error);}}
export async function GET(request:Request){try{
 const user=await identity(),url=new URL(request.url),id=url.searchParams.get('id');const {state}=await loadState(user.id);const m=state.materials.find(m=>m.id===id);if(!m)throw new AppError('找不到这份资料。',404);
 const isText=url.searchParams.get('text')==='1';const file=await files().get(user.id+'/'+id+(isText?'/text':'/file'));if(!file)throw new AppError('没有可读取的内容。',404);
 if(isText)return Response.json({text:await file.text()},{headers:{'Cache-Control':'no-store'}});
 const name=encodeURIComponent(m.name);return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType??'application/octet-stream','Content-Disposition':"inline; filename*=UTF-8''"+name,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 }catch(error){return respondError(error);}}
