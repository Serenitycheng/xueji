import Papa from 'papaparse';
import {type TimetableEntry} from './model';
import {validateUploadFile} from './material-upload';
export function readCsv(source:string){const result=Papa.parse<Record<string,string>>(source.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:x=>x.trim()});if(result.errors.some(e=>e.type==='Quotes'))throw new Error('CSV 引号格式不完整，请检查文件。');return {headers:result.meta.fields??[],rows:result.data};}
export function weekday(value:string){const v=value.trim().replace(/星期|周|礼拜/g,'');const map:Record<string,number>={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0,'7':0,'0':0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};if(v.toLowerCase() in map)return map[v.toLowerCase()];const n=Number(v);if(Number.isInteger(n)&&n>=1&&n<=6)return n;throw new Error('无法识别星期：'+value);}
export function csvEntries(rows:Record<string,string>[],mapping:Record<string,string>):TimetableEntry[]{
 return rows.map((r,i)=>{try{const get=(k:string)=>r[mapping[k]]??'';const cleanTime=(s:string)=>{const m=s.trim().match(/^(\d{1,2}):([0-5]\d)(?::\d\d)?$/);if(!m||Number(m[1])>23)throw new Error('时间应为08:00这样的格式');return m[1].padStart(2,'0')+':'+m[2];};const start=cleanTime(get('start')),end=cleanTime(get('end'));if(end<=start)throw new Error('结束时间必须晚于开始时间');const weeks=get('weeks').match(/(\d+)\s*[-~至到]\s*(\d+)/);return {id:'csv-'+i,name:get('name')||'课程',day:weekday(get('day')),start,end,weekStart:weeks?Number(weeks[1]):1,weekEnd:weeks?Number(weeks[2]):20,parity:get('weeks').includes('单')?'odd':get('weeks').includes('双')?'even':'all'};}catch(e){throw new Error('第'+(i+2)+'行：'+(e instanceof Error?e.message:'格式无效'));}});
}
export async function extractFile(file:File,onProgress:(s:string)=>void):Promise<{text:string;pages:number}>{
 const ext=validateUploadFile(file);
 if(ext==='pdf'){
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc="/vendor/pdf.worker.min.mjs";
 const task=pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,useSystemFonts:true});
 const timeout=setTimeout(()=>void task.destroy(),120000);
 try{
 const pdf=await task.promise;
 let text='';const limit=Math.min(pdf.numPages,500);
 try{for(let p=1;p<=limit;p++){onProgress('正在提取第 '+p+' / '+limit+' 页');const page=await pdf.getPage(p);const content=await page.getTextContent();text+='\n[PDF第'+p+'页]\n'+content.items.map(item=>'str' in item?item.str:'').join(' ')+'\n';page.cleanup();if(text.length>780000){text+='\n[后续内容未提取，请按章节拆分上传]';break;}}return {text:text.slice(0,800000),pages:pdf.numPages};}finally{await pdf.destroy();}
 }finally{clearTimeout(timeout);await task.destroy();}
 }
 if(ext==='pptx'||ext==='docx'){
 const {unzipSync,strFromU8}=await import('fflate');const bytes=new Uint8Array(await file.arrayBuffer());
 let expandedSize=0;
 const contents=unzipSync(bytes,{filter:f=>{if(!(/ppt\/slides\/slide\d+\.xml$/.test(f.name)||f.name==='word/document.xml'))return false;expandedSize+=f.originalSize;if(f.originalSize>4000000||expandedSize>16000000)throw new Error('解压后内容过大，请按章节拆分文件。');return true;}});let total=0;
 const names=Object.keys(contents).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const parts=names.map((name,i)=>{total+=contents[name].length;if(total>16000000)throw new Error('课件解压后内容过大，请拆成较小文件。');const doc=new DOMParser().parseFromString(strFromU8(contents[name]),'text/xml');return '[第'+(i+1)+(ext==='pptx'?'张幻灯片':'部分')+']\n'+Array.from(doc.getElementsByTagName('*')).filter(e=>e.localName==='t').map(e=>e.textContent).join(' ');});
 return {text:parts.join('\n\n').slice(0,800000),pages:names.length};
 }
 if(ext==='txt'||ext==='md')return {text:(await file.slice(0,3200000).text()).slice(0,800000),pages:0};
 throw new Error('支持 PDF、PPTX、DOCX、TXT 和 Markdown。');
}
