export const contentTypes:Record<string,string>={pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain; charset=utf-8',md:'text/plain; charset=utf-8'};
export function uploadMetadata(input:Record<string,unknown>){
 if(typeof input.id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(input.id))throw new Error('上传编号无效。');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>200)throw new Error('文件名无效或过长。');
 const ext=input.name.split('.').pop()?.toLowerCase()??'';if(!contentTypes[ext])throw new Error('支持 PDF、PPTX、DOCX、TXT 和 Markdown 文件。');
 if(typeof input.size!=='number'||input.size<=0||input.size>20*1024*1024)throw new Error('请选择20MB以内的有效文件。');
 if(typeof input.text!=='string'||input.text.length>800000)throw new Error('资料文字过长，请按章节拆分。');
 return {id:input.id,name:input.name,ext,size:input.size,text:input.text,pages:Math.max(0,Math.min(5000,Number(input.pages)||0))};
}
