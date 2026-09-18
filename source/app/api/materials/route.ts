import {enqueueMaterial} from '@/lib/material-jobs';
import {claimCommand,commandError} from '@/lib/commands';
import {saveMaterialText} from '@/lib/storage';
import {head} from '@vercel/blob';
import {identity,files,loadState,saveState,respondError,checkOrigin,AppError,log,snapshot,db} from '@/lib/server';
import {contentTypes,uploadMetadata} from '@/lib/material-upload';
import {verifyPdfOpenTicket} from '@/lib/pdf-open-ticket';
export async function POST(request:Request){let receiptId:string|undefined;try{
 checkOrigin(request);const user=await identity();if(Number(request.headers.get('content-length')??0)>3500000)throw new AppError('资料文字过长，请按章节拆分。');
 const input=await request.json();const claim=await claimCommand(user,input);if(claim.response)return claim.response;receiptId=claim.id;let metadata;try{metadata=uploadMetadata(input);}catch(e){throw new AppError(e instanceof Error?e.message:'上传信息无效。');}
 const {id,name,ext,size,text:extracted,pages}=metadata;
 const {state,revision}=await loadState(user.id);if(state.materials.some(m=>m.id===id)){await db().prepare("UPDATE study_receipts SET status='done',status_code=200,result=? WHERE id=?").bind(JSON.stringify({message:'资料已保存。'}),receiptId).run();return Response.json({snapshot:await snapshot(user.id,user.name),message:'资料已保存。'});}
 if(input.revision!==revision)throw new AppError('云端已有更新，文件已上传，登记草稿已保留。请比较后继续保存。',409);
 if(!state.subjects.some(s=>s.id===input.subjectId)&&!state.learning?.directions.some(d=>d.id===input.subjectId)&&input.subjectId!=='general')throw new AppError('请选择资料所属学科。');
 const prefix=user.id+'/'+id;const blob=await head(prefix+'/file');if(blob.size!==size)throw new AppError('上传未完成，请重新导入。');
 const textPath=extracted?await saveMaterialText(user.id,id,extracted):undefined;
 state.materials.push({id,textPath,subjectId:input.subjectId,name,kind:ext==='pdf'?'pdf':ext==='pptx'?'slides':'text',size,pages,textLength:extracted.length,status:extracted.trim().length>30?'ready':'needs-text',excerpt:extracted.slice(0,600),createdAt:new Date().toISOString()});
 log(state,'导入资料：'+name,'resource');await saveState(user.id,state,revision,{receiptId,reason:'导入资料：'+name,result:{message:'资料已保存。'}});
 let processingMessage='';if(ext){try{await enqueueMaterial(user.id,id);processingMessage='文件已保存，已加入电脑处理队列。';}catch{processingMessage='文件已保存，后台处理暂未启动。可在资料库继续处理。';}}
 return Response.json({snapshot:await snapshot(user.id,user.name),message:processingMessage||(extracted.trim().length>30?'资料已保存，文字已提取。':ext==='pdf'?'文件已保存，正在准备自动识别。':'文件已保存，未提取到足够文字。')});
 }catch(error){return commandError(receiptId,error);}}
export async function GET(request:Request){try{
 const url=new URL(request.url),id=url.searchParams.get('id'),ticket=url.searchParams.get('openToken');
 if(ticket!==null){
  if(!id||!await verifyPdfOpenTicket(ticket,{kind:'material',materialId:id}))throw new AppError('打开授权已失效，请回到学迹重新打开。',401);
  if(url.searchParams.get('text')==='1')throw new AppError('此授权仅用于打开 PDF 原件。',403);
 }
 const user=ticket!==null?{id:'owner'}:await identity();const {state}=await loadState(user.id);const m=state.materials.find(m=>m.id===id);if(!m)throw new AppError('找不到这份资料。',404);
 if(ticket!==null&&(m.kind!=='pdf'||m.url))throw new AppError('此授权仅用于打开 PDF 原件。',403);
 const isText=url.searchParams.get('text')==='1';const file=await files().get(isText?(m.textPath??user.id+'/'+id+'/text'):user.id+'/'+id+'/file');if(!file)throw new AppError('没有可读取的内容。',404);
 if(isText)return Response.json({text:await file.text()},{headers:{'Cache-Control':'no-store'}});
 const name=encodeURIComponent(m.name);const ext=m.name.split('.').pop()?.toLowerCase()??'';return new Response(file.body,{headers:{'Content-Type':contentTypes[ext]??'application/octet-stream','Content-Disposition':(url.searchParams.get('download')==='1'?'attachment':'inline')+"; filename*=UTF-8''"+name,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch(error){return respondError(error);}}
