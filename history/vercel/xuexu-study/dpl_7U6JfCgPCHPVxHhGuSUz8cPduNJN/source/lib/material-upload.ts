export const contentTypes:Record<string,string>={pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain; charset=utf-8',md:'text/plain; charset=utf-8'};
export const MAX_UPLOAD_MB=200;
export const MAX_UPLOAD_BYTES=MAX_UPLOAD_MB*1024*1024;
export const AUTO_EXTRACT_BYTES=30*1024*1024;
export function validateUploadFile(file:{name:unknown;size:unknown}){
 if(typeof file.name!=='string'||!file.name.trim()||file.name.length>200)throw new Error('文件名无效或过长。');
 const ext=file.name.split('.').pop()?.toLowerCase()??'';if(!contentTypes[ext])throw new Error('支持 PDF、PPTX、DOCX、TXT 和 Markdown 文件。');
 if(typeof file.size!=='number'||!Number.isInteger(file.size)||file.size<=0||file.size>MAX_UPLOAD_BYTES)throw new Error('请选择 '+MAX_UPLOAD_MB+'MB 以内的有效文件。');
 return ext;
}
export function uploadMetadata(input:Record<string,unknown>){
 if(typeof input.id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(input.id))throw new Error('上传编号无效。');
 const ext=validateUploadFile({name:input.name,size:input.size});
 if(typeof input.text!=='string'||input.text.length>800000)throw new Error('资料文字过长，请按章节拆分。');
 return {id:input.id,name:input.name as string,ext,size:input.size as number,text:input.text,pages:Math.max(0,Math.min(5000,Number(input.pages)||0))};
}
